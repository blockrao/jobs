#!/usr/bin/env python3
"""
Resolve organization IDs for 1,147 posts missing organizationId.
Uses fuzzy matching to map recruitment names to canonical organizations.
"""
import sys
sys.path.insert(0, '/home/claude/jobs')

from supabase import create_client
import os
from difflib import SequenceMatcher
import re

# Initialize Supabase client
SUPABASE_URL = "https://cusxodjgkrttwmdmhvso.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
if not SUPABASE_KEY:
    print("ERROR: SUPABASE_KEY environment variable not set")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def extract_org_name_from_recruitment(recruitment_name):
    """Extract likely organization name from recruitment name."""
    # Remove year suffix (e.g., " Recruitment 2026")
    name = re.sub(r'\s+Recruitment\s+\d{4}.*$', '', recruitment_name, flags=re.IGNORECASE)
    name = re.sub(r'\s*-\s*Apply.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s*–\s*Apply.*$', '', name, flags=re.IGNORECASE)
    
    # Remove job title parts (after " - " if present)
    if ' - ' in name:
        name = name.split(' - ')[0].strip()
    
    return name.strip()

def fuzzy_match_org(recruitment_name, orgs_list, threshold=0.7):
    """Find best matching organization using fuzzy matching."""
    org_extracted = extract_org_name_from_recruitment(recruitment_name)
    
    best_match = None
    best_score = 0
    
    for org in orgs_list:
        org_name = org['name'].lower()
        search_term = org_extracted.lower()
        
        # Exact substring match (highest priority)
        if search_term in org_name or org_name in search_term:
            return org, 1.0
        
        # Fuzzy matching
        ratio = SequenceMatcher(None, org_name, search_term).ratio()
        if ratio > best_score:
            best_score = ratio
            best_match = org
    
    if best_score >= threshold:
        return best_match, best_score
    return None, best_score

# Main execution
print("Fetching organizations...")
orgs_response = supabase.table('organizations').select('id, name').execute()
orgs = orgs_response.data
print(f"Loaded {len(orgs)} organizations")

print("\nFetching posts missing organizationId...")
posts_response = supabase.table('posts').select(
    'id, recruitmentId, recruitmentName'
).eq('organizationId', None).execute()
posts_missing_org = posts_response.data
print(f"Found {len(posts_missing_org)} posts missing organizationId")

# Get unique recruitment names
unique_recruitments = {}
for post in posts_missing_org:
    rec_name = post.get('recruitmentName', '')
    if rec_name not in unique_recruitments:
        unique_recruitments[rec_name] = {
            'recruitment_id': post.get('recruitmentId'),
            'post_count': 0,
            'org_id': None,
            'match_score': 0
        }
    unique_recruitments[rec_name]['post_count'] += 1

print(f"\nMatching {len(unique_recruitments)} unique recruitments to organizations...")

matches = []
for rec_name, rec_info in unique_recruitments.items():
    org, score = fuzzy_match_org(rec_name, orgs, threshold=0.65)
    if org:
        rec_info['org_id'] = org['id']
        rec_info['match_score'] = score
        matches.append({
            'recruitment_name': rec_name,
            'org_id': org['id'],
            'org_name': org['name'],
            'score': score,
            'posts': rec_info['post_count']
        })

print(f"\nMatched {len(matches)} recruitments:")
for match in sorted(matches, key=lambda x: x['score'], reverse=True)[:20]:
    print(f"  {match['score']:.2%} | {match['posts']:>3} posts | {match['recruitment_name'][:60]}")
    print(f"         → {match['org_name']}\n")

# Count posts that would be updated
total_posts_to_update = sum(m['posts'] for m in matches)
print(f"\nCan resolve {total_posts_to_update}/{len(posts_missing_org)} posts ({total_posts_to_update*100/len(posts_missing_org):.1f}%)")
print(f"Unmatched: {len(posts_missing_org) - total_posts_to_update} posts")

# Save results for review before applying
import json
with open('/tmp/claude-0/-home-claude-jobs/63bbf424-1dbe-5cea-bb2f-1a65f5cedf9b/scratchpad/org-matching-results.json', 'w') as f:
    json.dump({
        'total_posts_missing_org': len(posts_missing_org),
        'unique_recruitments': len(unique_recruitments),
        'matched': len(matches),
        'total_posts_to_update': total_posts_to_update,
        'matches': matches
    }, f, indent=2)

print(f"\nResults saved to org-matching-results.json")

