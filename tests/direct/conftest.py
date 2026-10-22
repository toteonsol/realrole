"""Shared fixtures and payload builders for RealRole direct-mode tests."""

import json
import os

import pytest

# Set RR_CONTRACT=build/realrole.deploy.py to test the compressed deploy build.
CONTRACT = os.environ.get("RR_CONTRACT", "contracts/realrole.py")
T0 = "2026-10-01T12:00:00Z"
GEN = 10**18


def to_hex(addr):
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    from genlayer.py.types import Address

    return Address(addr).as_hex


def greenhouse_job(pay=None, location="Hybrid - New York, NY", content="Build things.", first_published="2026-09-20T10:00:00-04:00"):
    ranges = []
    if pay:
        lo, hi, title = pay
        ranges = [{"min_cents": lo * 100, "max_cents": hi * 100, "currency_type": "USD", "title": title}]
    return json.dumps({
        "id": 111, "title": "Protocol Engineer", "location": {"name": location},
        "offices": [], "first_published": first_published,
        "updated_at": "2026-10-01T00:00:00-04:00", "pay_input_ranges": ranges,
        "content": f"&lt;p&gt;{content}&lt;/p&gt;",
    })


def lever_job(location="San Francisco, CA", salary=None, text="Hiring a smart contract engineer."):
    return json.dumps({
        "id": "abc-123", "text": "Smart Contract Engineer",
        "categories": {"location": location, "allLocations": [location]},
        "workplaceType": "onsite", "createdAt": 1790000000000,
        "descriptionPlain": text, "additionalPlain": "", "lists": [],
        "salaryRange": salary,
    })


def ashby_board(job_id="job-1", lo=150000, hi=400000, listed=True):
    return json.dumps({"jobs": [{
        "id": job_id, "title": "Staff Engineer", "location": "Remote - US",
        "secondaryLocations": [], "isRemote": True, "workplaceType": "Remote",
        "isListed": listed, "publishedAt": "2026-09-01T00:00:00.000+00:00",
        "descriptionPlain": "Work on DeFi.",
        "compensation": {"summaryComponents": [{
            "compensationType": "Salary", "interval": "1 YEAR",
            "currencyCode": "USD", "minValue": lo, "maxValue": hi,
        }]},
    }]})


def jsonld_page(salary=(120000, 150000), valid_through="2027-01-01", description="Join us."):
    job = {
        "@context": "https://schema.org", "@type": "JobPosting",
        "title": "Solidity Engineer", "description": f"<p>{description}</p>",
        "datePosted": "2026-09-25", "validThrough": valid_through,
        "jobLocation": {"@type": "Place", "address": {"addressLocality": "Denver", "addressRegion": "CO", "addressCountry": "US"}},
    }
    if salary:
        job["baseSalary"] = {"@type": "MonetaryAmount", "currency": "USD", "value": {
            "@type": "QuantitativeValue", "minValue": salary[0], "maxValue": salary[1], "unitText": "YEAR"}}
    return f'<html><head><script type="application/ld+json">{json.dumps(job)}</script></head><body>x</body></html>'


def llm(juris, text_pay=None):
    return json.dumps({"jurisdictions": juris, "text_pay": text_pay})


LLM_PATTERN = r"pay-transparency registry"


@pytest.fixture
def rr(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp(T0)
    direct_vm.sender = direct_alice
    return direct_deploy(CONTRACT, 60, 86400)
