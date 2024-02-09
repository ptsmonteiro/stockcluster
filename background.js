// Function to send a message to the content script to initiate scraping
function scrapeValue() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const activeTab = tabs[0];
    browser.tabs.sendMessage(activeTab.id, "scrapeValue");
  });
}

// Listen for clicks on the extension's browser action
browser.browserAction.onClicked.addListener(scrapeValue);
