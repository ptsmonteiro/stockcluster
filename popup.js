// Function to send a message to the background script to trigger scraping
function scrapeValue() {
    browser.runtime.sendMessage("scrapeValue");
  }
  
  // Attach the scrapeValue function to the button click event
  document.getElementById("scrapeButton").addEventListener("click", scrapeValue);