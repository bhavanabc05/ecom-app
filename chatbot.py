import streamlit as st
from groq import Groq
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

st.title("💎 Jewellery Store Assistant")

@st.cache_data(ttl=600) 
def fetch_products():
    """Fetch and optimize product catalog from backend"""
    try:
        response = requests.get("http://localhost:3000/api/products", timeout=5) 
        if response.status_code == 200:
            all_products = response.json()
            
            if not all_products:
                return []
            
            optimized_catalog = []
            for p in all_products:
                optimized_catalog.append({
                    "name": p.get("name", "Unknown"), 
                    "price": p.get("price", 0),
                    "category": p.get("category", "Other"),
                    "description": p.get("description", ""),
                    "_id": p.get("_id")
                })
            
            return sorted(optimized_catalog, key=lambda x: x.get("price", 0))
            
        return []
    except requests.exceptions.Timeout:
        st.error("Backend service is slow. Please refresh the page.")
        return []
    except Exception as e:
        st.error(f"Could not connect to store: {str(e)[:50]}")
        return []

products = fetch_products()


def build_catalog_summary(products):
    if not products:
        return "The store currently has no jewellery items listed."

    if len(products) <= 10:
        rows = [
            f"• {p.get('name')} ({p.get('category', 'Unknown')}) - ₹{p.get('price', 'N/A')} - {p.get('description', '')}"
            for p in products
        ]
        return "Available Products:\n" + "\n".join(rows)

    categories = {}
    price_range = {"min": float("inf"), "max": 0}
    
    for p in products:
        category = p.get("category", "Other")
        categories.setdefault(category, []).append(p)
        price = p.get("price", 0)
        if isinstance(price, (int, float)):
            price_range["min"] = min(price_range["min"], price)
            price_range["max"] = max(price_range["max"], price)

    summary_lines = ["JEWELRY CATEGORIES:"]
    for category, items in sorted(categories.items()):
        price_samples = [str(item.get("price", "N/A")) for item in items[:2]]
        summary_lines.append(f"  • {category}: {len(items)} items (₹{', ₹'.join(price_samples)}...)")

    price_min = price_range.get("min", 0)
    price_max = price_range.get("max", 0)
    if price_min < float("inf") and price_max > 0:
        summary_lines.append(f"\nPrice Range: ₹{price_min} - ₹{price_max}")

    return "\n".join(summary_lines)


def find_matching_products(query, products):
    """Smart product matching with synonym and prefix support"""
    q = query.lower().strip()
    if not q:
        return []

    terms = [term for term in q.split() if len(term) > 2]
    if not terms:
        return []
    
    # Create synonym mappings
    synonyms = {
        "chain": ["necklace", "pendant"],
        "ring": ["band", "solitaire"],
        "bracelet": ["bangle", "cuff"],
        "earring": ["stud", "hoop"],
        "gold": ["yellow", "au"],
        "silver": ["ag", "sterling"],
        "diamond": ["stone", "gem"],
        "cheap": ["affordable", "budget", "under"],
        "expensive": ["premium", "luxury", "over"]
    }
    
    expanded_terms = set(terms)
    for term in terms:
        if term in synonyms:
            expanded_terms.update(synonyms[term])
    
    matches = []
    for product in products:
        text = " ".join([
            str(product.get("name", "")),
            str(product.get("category", "")),
            str(product.get("description", "")),
        ]).lower()

        match_count = sum(1 for term in expanded_terms if term in text)
        
        if match_count > 0:
            matches.append((match_count, product))

    matches.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in matches[:5]]


def get_optimized_prompt(products):
    """Generate an optimized system prompt with better context"""
    catalog = build_catalog_summary(products)
    
    return f"""You are an expert jewellery store assistant. Your role is to help customers find perfect jewellery pieces.

STORE INVENTORY:
{catalog}

IMPORTANT GUIDELINES:
1. Be conversational and friendly, but concise (max 2-3 sentences per response)
2. Only recommend products from the catalog above
3. Highlight price and features that match customer needs
4. Ask clarifying questions if needed (e.g., "Are you looking for casual or formal wear?")
5. If asked about products not in catalog, apologize and redirect to available items
6. Use rupees (₹) for all prices
7. Format recommendations as simple bullet points
8. End recommendations with a call-to-action like "Would you like to know more?"

EXAMPLE INTERACTIONS:
Q: "Show me gold rings"
A: "We have beautiful gold rings! Our Gold Ring is priced at ₹5000 and is perfect for everyday wear. Would you like to see other options?"

Q: "What's your cheapest item?"
A: "Our most affordable piece is the Silver Necklace at ₹3000. It's elegant and versatile. Would you like to explore other options?"

Remember: Keep responses brief, focused, and product-centric."""


catalog_summary = build_catalog_summary(products)
product_context = get_optimized_prompt(products)

if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "system", "content": product_context},
        {"role": "assistant", "content": "👋 Welcome to our jewellery store! What can I help you find today?"}
    ]

for message in st.session_state.messages:
    if message["role"] != "system":
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

if prompt := st.chat_input("Ask about our jewellery..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        response_placeholder = st.empty()
        matched_products = find_matching_products(prompt, products)

        if matched_products:
            reply_lines = [
                f"• **{p.get('name')}** ({p.get('category', 'Unknown')}) — ₹{p.get('price')}"
                for p in matched_products
            ]
            bot_reply = (
                "I found these perfect matches for you:\n\n" + "\n".join(reply_lines) + "\n\n**Would you like more details about any of these?**"
            )
            response_placeholder.markdown(bot_reply)
            st.session_state.messages.append({"role": "assistant", "content": bot_reply})
        else:
            try:
                recent_context = st.session_state.messages[-4:]
                
                chat_completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": product_context}
                    ] + recent_context,
                    model="llama-3.1-8b-instant",
                    temperature=0.3,
                    max_tokens=200,
                    top_p=0.8,
                    frequency_penalty=0.5,
                )

                bot_reply = chat_completion.choices[0].message.content.strip()
                response_placeholder.markdown(bot_reply)
                st.session_state.messages.append({"role": "assistant", "content": bot_reply})

            except Exception as e:
                error_msg = str(e)
                if "413" in error_msg or "too large" in error_msg.lower():
                    st.error("Request too large. Please ask a more specific question.")
                elif "rate limit" in error_msg.lower() or "429" in error_msg:
                    st.warning("⏳ Service busy. Please try again in a moment.")
                else:
                    st.error(f"Oops! {error_msg[:100]}")

