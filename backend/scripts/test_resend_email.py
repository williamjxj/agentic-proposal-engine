#!/usr/bin/env python3
"""
Quick test script for Resend email with verified domain.

Usage:
    python scripts/test_resend_email.py

Requirements:
    - RESEND_API_KEY environment variable set
    - Or edit api_key directly in this script
"""
import os
import sys

try:
    import resend
except ImportError:
    print("❌ Error: resend package not installed")
    print("Install with: pip install resend")
    sys.exit(1)


def test_email():
    """Send a test email using verified domain service@bestitconsulting.ca"""

    # Get API key from environment or set it here
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print("❌ Error: RESEND_API_KEY environment variable not set")
        print("Set it with: export RESEND_API_KEY=your_key")
        print("Or edit this script and add: api_key = 'your_key'")
        sys.exit(1)

    resend.api_key = api_key

    # Configure test email
    test_recipient = input("Enter test recipient email (default: bestitconsultingca@gmail.com): ").strip()
    if not test_recipient:
        test_recipient = "bestitconsultingca@gmail.com"

    # Configure BCC
    bcc_email = input("Enter BCC email for copy (default: bestitconsultingca@gmail.com, press Enter to skip): ").strip()
    if not bcc_email:
        bcc_email = "bestitconsultingca@gmail.com"

    print(f"\n📧 Sending test email...")
    print(f"   FROM: service@bestitconsulting.ca (verified domain)")
    print(f"   TO: {test_recipient}")
    if bcc_email:
        print(f"   BCC: {bcc_email} (will receive a copy)")
    print(f"   SUBJECT: Test from Resend with Verified Domain")

    try:
        email_params = {
            "from": "service@bestitconsulting.ca",
            "to": test_recipient,
            "subject": "Test from Resend with Verified Domain",
            "html": f"""
                <h1>✅ It works!</h1>
                <p>This email was sent from <strong>service@bestitconsulting.ca</strong></p>
                <p>Your domain is verified and ready for production use.</p>
                {f'<p><strong>BCC Feature Active:</strong> A copy was sent to {bcc_email}</p>' if bcc_email else ''}
                <hr>
                <p style="color: #666; font-size: 0.9em;">
                    Sent via Auto-Bidder Email System<br>
                    Best IT Consulting<br>
                    <a href="https://www.bestitconsulting.ca">www.bestitconsulting.ca</a>
                </p>
            """
        }

        # Add BCC if provided
        if bcc_email:
            email_params["bcc"] = [bcc_email]

        result = resend.Emails.send(email_params)

        print(f"\n✅ Email sent successfully!")
        print(f"   Message ID: {result.get('id', 'N/A')}")
        print(f"\n💡 Check your inbox at: {test_recipient}")
        if bcc_email:
            print(f"   Also check BCC inbox at: {bcc_email}")
