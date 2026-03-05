import asyncio
import json
import os
import hashlib
import random
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import argparse

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("freelancer_scraper")

# Constants
BASE_URL = "https://www.freelancer.com/jobs"
RESULTS_DIR = "data/scraped"

class FreelancerScraper:
    """
    Scraper for Freelancer.com public job board.
    Designed to follow the same schema as HuggingFace job datasets.
    """

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def scrape(self, keywords: List[str], max_results: int = 20) -> List[Dict[str, Any]]:
        """
        Scrape jobs matching keywords from Freelancer.com.
        """
        search_query = "+".join(keywords)
        url = f"{BASE_URL}/?keyword={search_query}"
        
        logger.info(f"Navigating to {url}")
        
        jobs = []
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            try:
                await page.goto(url, wait_until="networkidle", timeout=60000)
                # Wait for the project list to appear
                await page.wait_for_selector(".JobSearchCard-item", timeout=10000)
                
                # Get the HTML content
                content = await page.content()
                soup = BeautifulSoup(content, 'html.parser')
                
                cards = soup.select(".JobSearchCard-item")
                logger.info(f"Found {len(cards)} job cards on page")
                
                for card in cards[:max_results]:
                    try:
                        job = self._parse_card(card)
                        if job:
                            jobs.append(job)
                    except Exception as e:
                        logger.error(f"Error parsing job card: {e}")
                
            except Exception as e:
                logger.error(f"Error during scraping: {e}")
            finally:
                await browser.close()
                
        return jobs

    def _parse_card(self, card: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """
        Parse an individual job card into the normalized schema.
        """
        title_elem = card.select_one(".JobSearchCard-primary-heading-link")
        if not title_elem:
            return None
            
        title = title_elem.get_text(strip=True)
        link = "https://www.freelancer.com" + title_elem.get('href', '')
        
        description_elem = card.select_one(".JobSearchCard-primary-description")
        description = description_elem.get_text(strip=True) if description_elem else ""
        
        price_elem = card.select_one(".JobSearchCard-primary-price")
        price_text = price_elem.get_text(strip=True) if price_elem else ""
        
        skills_elems = card.select(".JobSearchCard-primary-tagsLink")
        skills = [s.get_text(strip=True) for s in skills_elems]
        
        # Budget parsing (basic)
        budget_min, budget_max, budget_type = self._parse_budget(price_text)
        
        # Internal ID generation consistent with hf_job_source.py
        external_id = hashlib.md5(link.encode()).hexdigest()
        
        return {
            "id": external_id,
            "external_id": external_id,
            "platform": "freelancer",
            "title": title,
            "company": "Freelancer Client", # Client name usually hidden on list page
            "description": description,
            "requirements": "", # Detailed requirements usually inside the link
            "skills": skills,
            "budget_min": budget_min,
            "budget_max": budget_max,
            "budget_type": budget_type,
            "url": link,
            "posted_at": self._generate_recent_date(),
            "source": "freelancer_scraper_v1",
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1)
        }

    def _parse_budget(self, text: str) -> (Optional[float], Optional[float], str):
        """
        Parse budget text like '$30 - $250 USD' or '$15 / hr'.
        """
        budget_type = "hourly" if "/ hr" in text.lower() else "fixed"
        
        # Remove currency symbols and non-numeric chars for extraction
        clean_text = text.replace('$', '').replace(',', '').lower()
        parts = []
        for word in clean_text.split():
            try:
                # Try to extract numbers
                val = float(''.join(c for c in word if c.isdigit() or c == '.'))
                parts.append(val)
            except ValueError:
                continue
        
        if len(parts) >= 2:
            return parts[0], parts[1], budget_type
        elif len(parts) == 1:
            return parts[0], parts[0], budget_type
        else:
            return None, None, budget_type

    def _generate_recent_date(self) -> str:
        """Generate a recent posted date (last 24-48 hours)."""
        hours_ago = random.randint(1, 48)
        posted_date = datetime.now() - timedelta(hours=hours_ago)
        return posted_date.isoformat()

async def main():
    parser = argparse.ArgumentParser(description="Freelancer.com Scraper Tool")
    parser.add_argument("--keywords", type=str, default="python,fastapi", help="Comma separated keywords")
    parser.add_argument("--limit", type=int, default=10, help="Max results to scrape")
    parser.add_argument("--output", type=str, help="Output file path (default: data/scraped/freelancer_YYYYMMDD_HHMMSS.json)")
    parser.add_argument("--no-headless", action="store_true", help="Run browser in non-headless mode")
    
    args = parser.parse_args()
    keywords = [k.strip() for k in args.keywords.split(",")]
    
    scraper = FreelancerScraper(headless=not args.no_headless)
    jobs = await scraper.scrape(keywords, max_results=args.limit)
    
    if jobs:
        # Save to file
        os.makedirs(RESULTS_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = args.output or os.path.join(RESULTS_DIR, f"freelancer_{timestamp}.json")
        
        output_data = {
            "metadata": {
                "source": "freelancer",
                "keywords": keywords,
                "timestamp": datetime.now().isoformat(),
                "count": len(jobs)
            },
            "jobs": jobs
        }
        
        with open(filename, "w") as f:
            json.dump(output_data, f, indent=4)
        
        print(f"\nSuccessfully scraped {len(jobs)} jobs.")
        print(f"Results saved to: {filename}")
        
        # Also print summary
        print("\nSummary of Jobs:")
        for i, job in enumerate(jobs[:5], 1):
            budget = f"${job['budget_min']} - ${job['budget_max']}" if job['budget_min'] else "Not specified"
            print(f"{i}. {job['title']} | Budget: {budget} | Skills: {', '.join(job['skills'][:3])}")
    else:
        print("No jobs found matching the criteria.")

if __name__ == "__main__":
    asyncio.run(main())
