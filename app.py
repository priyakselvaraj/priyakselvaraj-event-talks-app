from flask import Flask, jsonify, render_template, abort
import urllib.request
import ssl
import xml.etree.ElementTree as ET
import re
import os

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_entry_content(content_html):
    """
    Parses the entry's HTML content to split it into distinct updates
    based on the <h3>Category</h3> tags.
    """
    if not content_html:
        return []
    
    # Split by <h3>...</h3> tags and capture the heading content
    parts = re.split(r'<h3>(.*?)</h3>', content_html)
    
    updates = []
    if len(parts) > 1:
        # First part is text before the first <h3> (should be empty or whitespace)
        # Subsequent parts alternate between the category heading and the body HTML
        for i in range(1, len(parts), 2):
            category = parts[i].strip()
            body = parts[i+1].strip() if i+1 < len(parts) else ""
            updates.append({
                "category": category,
                "body": body
            })
    else:
        # If there are no <h3> tags, default to category "Update" and the whole body
        updates.append({
            "category": "Update",
            "body": content_html.strip()
        })
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        # Create an unverified SSL context to prevent CERTIFICATE_VERIFY_FAILED error on macOS
        ctx = ssl._create_unverified_context()
        
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        
        with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        
        # Atom Namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        feed_title = root.find('atom:title', ns)
        feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
        
        feed_updated = root.find('atom:updated', ns)
        feed_updated_text = feed_updated.text if feed_updated is not None else ""
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            entry_id = entry.find('atom:id', ns)
            id_text = entry_id.text if entry_id is not None else ""
            
            title = entry.find('atom:title', ns)
            title_text = title.text if title is not None else ""
            
            updated = entry.find('atom:updated', ns)
            updated_text = updated.text if updated is not None else ""
            
            # Find the link with rel="alternate" or just the first link
            link_url = ""
            for l in entry.findall('atom:link', ns):
                rel = l.get('rel')
                if rel == 'alternate' or not rel:
                    link_url = l.get('href', '')
                    break
                    
            content = entry.find('atom:content', ns)
            content_html = content.text if content is not None else ""
            
            updates = parse_entry_content(content_html)
            
            entries.append({
                "id": id_text,
                "date": title_text,
                "iso_date": updated_text,
                "link": link_url,
                "updates": updates
            })
            
        return jsonify({
            "title": feed_title_text,
            "updated": feed_updated_text,
            "entries": entries
        })
        
    except Exception as e:
        app.logger.error(f"Error fetching release notes: {str(e)}")
        return jsonify({
            "error": "Failed to fetch release notes from Google Cloud Platform feed. Please try again.",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5001)
