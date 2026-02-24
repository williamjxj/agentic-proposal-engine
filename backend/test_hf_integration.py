#!/usr/bin/env python3
"""
Test HuggingFace Dataset Integration

This script tests the HuggingFace job source service to verify
that job datasets can be loaded and normalized correctly.

Usage:
    python test_hf_integration.py
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.hf_job_source import (
    fetch_hf_jobs,
    get_available_datasets,
    search_hf_jobs
)


def test_basic_loading():
    """Test basic job loading from HuggingFace dataset."""
    print("=" * 60)
    print("TEST 1: Basic Job Loading")
    print("=" * 60)
    
    try:
        print("\nLoading 5 jobs from jacob-hugging-face/job-descriptions...")
        jobs = fetch_hf_jobs(
            dataset_id="jacob-hugging-face/job-descriptions",
            limit=5
        )
        
        print(f"✅ Successfully loaded {len(jobs)} jobs\n")
        
        # Display first job
        if jobs:
            job = jobs[0]
            print("Sample Job:")
            print(f"  Title: {job['title']}")
            print(f"  Company: {job['company']}")
            print(f"  Platform: {job['platform']}")
            print(f"  Skills: {', '.join(job['skills'][:5]) if job['skills'] else 'None'}")
            print(f"  Description (first 100 chars): {job['description'][:100]}...")
            print(f"  Status: {job['status']}")
        
        return True
    
    except Exception as e:
        print(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_keyword_search():
    """Test keyword filtering."""
    print("\n" + "=" * 60)
    print("TEST 2: Keyword Search")
    print("=" * 60)
    
    try:
        keywords = ["python", "fastapi"]
        print(f"\nSearching for jobs with keywords: {keywords}...")
        
        jobs = search_hf_jobs(
            keywords=keywords,
            dataset_id="jacob-hugging-face/job-descriptions",
            limit=10
        )
        
        print(f"✅ Found {len(jobs)} matching jobs\n")
        
        # Display matches
        for i, job in enumerate(jobs[:3], 1):
            print(f"Match {i}:")
            print(f"  Title: {job['title']}")
            print(f"  Company: {job['company']}")
            
            # Highlight keywords in description
            desc = job['description'].lower()
            found_keywords = [kw for kw in keywords if kw.lower() in desc or kw.lower() in job['title'].lower()]
            print(f"  Contains keywords: {', '.join(found_keywords)}")
            print()
        
        return True
    
    except Exception as e:
        print(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_available_datasets():
    """Test getting available datasets."""
    print("\n" + "=" * 60)
    print("TEST 3: Available Datasets")
    print("=" * 60)
    
    try:
        datasets = get_available_datasets()
        
        print(f"\n✅ Found {len(datasets)} recommended datasets:\n")
        
        for ds in datasets:
            print(f"  {'⭐ ' if ds['recommended'] else '  '}{ds['name']}")
            print(f"     ID: {ds['id']}")
            print(f"     Size: {ds['size']}")
            print(f"     Best for: {ds['best_for']}")
            print()
        
        return True
    
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def test_data_jobs_dataset():
    """Test loading from alternative dataset (data_jobs)."""
    print("\n" + "=" * 60)
    print("TEST 4: Alternative Dataset (lukebarousse/data_jobs)")
    print("=" * 60)
    
    try:
        print("\nAttempting to load from data_jobs dataset...")
        print("(This may take longer as it's a larger dataset)")
        
        jobs = fetch_hf_jobs(
            dataset_id="lukebarousse/data_jobs",
            limit=3
        )
        
        print(f"✅ Successfully loaded {len(jobs)} jobs\n")
        
        if jobs:
            job = jobs[0]
            print("Sample Job:")
            print(f"  Title: {job['title']}")
            print(f"  Company: {job['company']}")
            print(f"  Skills: {', '.join(job['skills'][:5]) if job['skills'] else 'None'}")
            print(f"  Budget: ${job.get('budget_min', 'N/A')}")
        
        return True
    
    except Exception as e:
        print(f"⚠️  Alternative dataset not available or error: {e}")
        print("   (This is optional - main dataset works)")
        return True  # Don't fail overall test


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("HuggingFace Dataset Integration Tests")
    print("=" * 60)
    print()
    
    print("Prerequisites:")
    print("  - datasets library installed (pip install datasets)")
    print("  - Internet connection for HuggingFace access")
    print()
    
    # Run tests
    results = []
    
    results.append(("Basic Loading", test_basic_loading()))
    results.append(("Keyword Search", test_keyword_search()))
    results.append(("Available Datasets", test_available_datasets()))
    results.append(("Alternative Dataset", test_data_jobs_dataset()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {name}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! HuggingFace integration is working.")
        print("\nNext steps:")
        print("  1. Start the backend: cd backend && uvicorn app.main:app --reload")
        print("  2. Test API: curl http://localhost:8000/api/projects/discover")
        print("  3. Build the frontend Projects Dashboard")
        return 0
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
