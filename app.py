from flask import Flask, jsonify, render_template
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from datetime import datetime
import re

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
NS = {"atom": "http://www.w3.org/2005/Atom"}

def parse_date(date_str):
    """Parse ISO datetime string into a readable format."""
    try:
        # e.g., 2026-06-17T00:00:00-07:00
        # Python 3.11+ can parse timezone-aware ISO format natively with datetime.fromisoformat
        dt = datetime.fromisoformat(date_str)
        return dt.strftime("%B %d, %Y")
    except Exception:
        return date_str

def split_html_by_headers(html_content):
    """Split HTML content of an entry into sub-updates grouped by headers (h3/h2/h4)."""
    if not html_content:
        return []
        
    soup = BeautifulSoup(html_content, "html.parser")
    updates = []
    
    headers = soup.find_all(['h2', 'h3', 'h4'])
    
    if not headers:
        # Fallback if there are no headers in the HTML
        text_content = soup.get_text().strip()
        # Clean up excessive newlines/spaces
        text_content = re.sub(r'\s+', ' ', text_content)
        if text_content:
            updates.append({
                "type": "Announcement",
                "text": text_content,
                "html": str(soup)
            })
        return updates
        
    for header in headers:
        header_type = header.get_text().strip()
        
        # Collect sibling elements until the next header
        sibling_html = []
        sibling_text = []
        curr = header.next_sibling
        
        while curr:
            if curr.name in ['h2', 'h3', 'h4']:
                break
            if curr.name:
                # Keep original element structure
                sibling_html.append(str(curr))
                # Get plain text
                t = curr.get_text().strip()
                if t:
                    sibling_text.append(t)
            elif str(curr).strip():
                # Plain text node sibling
                sibling_html.append(str(curr))
                sibling_text.append(str(curr).strip())
            curr = curr.next_sibling
            
        text_content = " ".join(sibling_text)
        text_content = re.sub(r'\s+', ' ', text_content) # Clean whitespace
        
        updates.append({
            "type": header_type,
            "text": text_content,
            "html": "".join(sibling_html)
        })
        
    return updates

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    try:
        response = requests.get(FEED_URL, timeout=15)
        if response.status_code != 200:
            return jsonify({
                "success": False,
                "error": f"Failed to fetch feed. Status code: {response.status_code}"
            }), 502
            
        root = ET.fromstring(response.content)
        entries = root.findall("atom:entry", NS)
        
        parsed_entries = []
        
        for entry in entries:
            title = entry.find("atom:title", NS)
            title_text = title.text if title is not None else "Unknown Date"
            
            updated = entry.find("atom:updated", NS)
            updated_text = updated.text if updated is not None else ""
            formatted_date = parse_date(updated_text) if updated_text else title_text
            
            link_elem = entry.find("atom:link", NS)
            link_url = ""
            if link_elem is not None:
                link_url = link_elem.attrib.get("href", "")
                
            content_elem = entry.find("atom:content", NS)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Extract sub-updates
            sub_updates = split_html_by_headers(content_html)
            
            parsed_entries.append({
                "date": formatted_date,
                "raw_date": updated_text,
                "link": link_url,
                "updates": sub_updates
            })
            
        return jsonify({
            "success": True,
            "data": parsed_entries
        })
        
    except ET.ParseError:
        return jsonify({
            "success": False,
            "error": "Failed to parse feed XML. The source feed might be invalid."
        }), 500
    except requests.RequestException as e:
        return jsonify({
            "success": False,
            "error": f"Network error fetching feed: {str(e)}"
        }), 503
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
