
"""
Browser Automation Service
Provides web browser automation capabilities using Selenium WebDriver and Google Gemini AI
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
import google.generativeai as genai
import os
from datetime import datetime
import base64
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BrowserAutomationService:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.setup_gemini()
        
    def setup_gemini(self):
        """Initialize Google Gemini AI"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")
        
    def start_browser(self, headless: bool = False):
        """Start Chrome browser with optimal settings"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless")
        
        # Add useful options
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.wait = WebDriverWait(self.driver, 10)
        
    def close_browser(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()
            self.driver = None
            
    def navigate_to_url(self, url: str):
        """Navigate to a specific URL"""
        if not self.driver:
            self.start_browser()
        
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        self.driver.get(url)
        time.sleep(2)  # Wait for page to load
        
    def take_screenshot(self) -> str:
        """Take a screenshot and return base64 encoded string"""
        if not self.driver:
            return ""
        
        screenshot = self.driver.get_screenshot_as_png()
        return base64.b64encode(screenshot).decode('utf-8')
        
    def get_page_info(self) -> Dict[str, Any]:
        """Get current page information"""
        if not self.driver:
            return {}
        
        return {
            "title": self.driver.title,
            "url": self.driver.current_url,
            "page_source_length": len(self.driver.page_source)
        }
        
    def find_element_by_text(self, text: str):
        """Find element by visible text"""
        try:
            # Try different strategies to find element
            selectors = [
                f"//button[contains(text(), '{text}')]",
                f"//a[contains(text(), '{text}')]",
                f"//span[contains(text(), '{text}')]",
                f"//div[contains(text(), '{text}')]",
                f"//*[contains(text(), '{text}')]"
            ]
            
            for selector in selectors:
                try:
                    element = self.driver.find_element(By.XPATH, selector)
                    return element
                except:
                    continue
            
            return None
        except Exception as e:
            logger.error(f"Error finding element by text '{text}': {e}")
            return None
            
    def click_element(self, selector: str = None, text: str = None):
        """Click an element by selector or text"""
        try:
            element = None
            
            if selector:
                element = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
            elif text:
                element = self.find_element_by_text(text)
            
            if element:
                # Scroll to element first
                self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                time.sleep(0.5)
                
                # Try clicking
                element.click()
                time.sleep(1)
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error clicking element: {e}")
            return False
            
    def type_text(self, selector: str, text: str):
        """Type text into an input field"""
        try:
            element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
            element.clear()
            element.send_keys(text)
            time.sleep(0.5)
            return True
        except Exception as e:
            logger.error(f"Error typing text: {e}")
            return False
            
    def scroll_page(self, direction: str = "down", amount: int = 3):
        """Scroll the page"""
        try:
            if direction == "down":
                for _ in range(amount):
                    self.driver.execute_script("window.scrollBy(0, 300);")
                    time.sleep(0.3)
            elif direction == "up":
                for _ in range(amount):
                    self.driver.execute_script("window.scrollBy(0, -300);")
                    time.sleep(0.3)
            return True
        except Exception as e:
            logger.error(f"Error scrolling: {e}")
            return False
            
    def press_key(self, key: str):
        """Press a keyboard key"""
        try:
            actions = ActionChains(self.driver)
            if key.upper() == "ENTER":
                actions.send_keys(Keys.ENTER)
            elif key.upper() == "TAB":
                actions.send_keys(Keys.TAB)
            elif key.upper() == "ESCAPE":
                actions.send_keys(Keys.ESCAPE)
            else:
                actions.send_keys(key)
            
            actions.perform()
            time.sleep(0.5)
            return True
        except Exception as e:
            logger.error(f"Error pressing key: {e}")
            return False
            
    def generate_actions_from_objective(self, objective: str, current_url: str = None) -> List[Dict[str, Any]]:
        """Use Gemini AI to generate browser automation actions"""
        try:
            page_info = self.get_page_info()
            
            prompt = f"""
            You are a browser automation expert. Given the following objective and current page information, 
            generate a sequence of browser automation actions.

            Objective: {objective}
            Current URL: {current_url or page_info.get('url', 'Not available')}
            Page Title: {page_info.get('title', 'Not available')}

            Available actions:
            1. navigate - Navigate to a URL
            2. click - Click an element (by selector or text)
            3. type - Type text into an input field
            4. scroll - Scroll the page (up/down)
            5. press_key - Press a keyboard key
            6. wait - Wait for a specified time

            Return a JSON array of actions in this format:
            [
                {{"action": "navigate", "url": "https://example.com"}},
                {{"action": "click", "selector": "#submit-button"}},
                {{"action": "type", "selector": "input[name='search']", "text": "search term"}},
                {{"action": "scroll", "direction": "down", "amount": 3}},
                {{"action": "press_key", "key": "ENTER"}},
                {{"action": "wait", "seconds": 2}}
            ]

            Focus on practical, working actions that will accomplish the objective.
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse the response and extract JSON
            response_text = response.text
            if '```json' in response_text:
                json_start = response_text.find('```json') + 7
                json_end = response_text.find('```', json_start)
                response_text = response_text[json_start:json_end]
            elif '[' in response_text and ']' in response_text:
                json_start = response_text.find('[')
                json_end = response_text.rfind(']') + 1
                response_text = response_text[json_start:json_end]
            
            actions = json.loads(response_text)
            return actions
            
        except Exception as e:
            logger.error(f"Error generating actions: {e}")
            return []
            
    def execute_action(self, action: Dict[str, Any]) -> bool:
        """Execute a single browser action"""
        try:
            action_type = action.get("action")
            
            if action_type == "navigate":
                self.navigate_to_url(action.get("url"))
                return True
                
            elif action_type == "click":
                selector = action.get("selector")
                text = action.get("text")
                return self.click_element(selector=selector, text=text)
                
            elif action_type == "type":
                selector = action.get("selector")
                text = action.get("text")
                return self.type_text(selector, text)
                
            elif action_type == "scroll":
                direction = action.get("direction", "down")
                amount = action.get("amount", 3)
                return self.scroll_page(direction, amount)
                
            elif action_type == "press_key":
                key = action.get("key")
                return self.press_key(key)
                
            elif action_type == "wait":
                seconds = action.get("seconds", 1)
                time.sleep(seconds)
                return True
                
            else:
                logger.warning(f"Unknown action type: {action_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing action {action}: {e}")
            return False
            
    def execute_automation_sequence(self, objective: str, actions: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a complete automation sequence"""
        try:
            if not self.driver:
                self.start_browser()
            
            # Generate actions if not provided
            if not actions:
                actions = self.generate_actions_from_objective(objective)
            
            results = []
            success_count = 0
            
            for i, action in enumerate(actions):
                logger.info(f"Executing action {i+1}/{len(actions)}: {action}")
                
                success = self.execute_action(action)
                results.append({
                    "action": action,
                    "success": success,
                    "step": i + 1
                })
                
                if success:
                    success_count += 1
                else:
                    logger.warning(f"Action failed: {action}")
                
                # Take screenshot after each action for debugging
                if i % 3 == 0:  # Every 3rd action
                    screenshot = self.take_screenshot()
                    results[-1]["screenshot"] = screenshot
            
            # Final screenshot
            final_screenshot = self.take_screenshot()
            page_info = self.get_page_info()
            
            return {
                "success": success_count > 0,
                "message": f"Executed {success_count}/{len(actions)} actions successfully",
                "results": results,
                "final_screenshot": final_screenshot,
                "page_info": page_info,
                "objective": objective
            }
            
        except Exception as e:
            logger.error(f"Error in automation sequence: {e}")
            return {
                "success": False,
                "message": f"Automation failed: {str(e)}",
                "error": str(e)
            }
            
    def health_check(self) -> Dict[str, Any]:
        """Health check endpoint"""
        return {
            "status": "healthy",
            "browser_active": self.driver is not None,
            "timestamp": datetime.now().isoformat()
        }

# Global instance
browser_service = BrowserAutomationService()
