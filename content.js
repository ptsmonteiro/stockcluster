function scrapeDegiro() {
    const selector = "span[data-name='symbolIsin']"

    positions = []
    for (var ISINElem of document.querySelectorAll(selector)) {
        console.log(ISINElem.textContent)
        position = {
            'broker': 'Degiro',
            'ticker': ISINElem.textContent.match(/(\w+)\W*(\w*)/)[1],
            'isin': ISINElem.textContent.match(/(\w+)\W*(\w*)/)[2],
            'name': ISINElem.closest("tr").querySelector("span[data-name='productName']").title,
            'qty': ISINElem.closest("tr").querySelector("span[data-field='size']").title,
            'currency': ISINElem.closest("tr").querySelector("td[data-field='currency']").textContent,
            'lastPrice': ISINElem.closest("tr").querySelector("span[data-field='price']").title,
            'lastPriceDate': new Date().toISOString(),
            'breakEvenPrice': ISINElem.closest("tr").querySelector("span[data-field='breakEvenPrice']").title,
        }
        positions.push(position)
    }

    if (positions.length > 0) {
        console.log("Saving " + String(positions.length) + " Degiro positions")
        browser.storage.local.set({ "positions_degiro": positions});
    }
}

function observeDegiro() {
    // Select the node that will be observed for mutations
    const targetNode = document.getElementById("mainContent");

    // Options for the observer (which mutations to observe)
    const config = { attributes: true, childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (document.querySelector("div[data-product-type-id='2']")) {
                scrapeDegiro()
                observer.disconnect();
            }
        }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(document, config);

    // Later, you can stop observing
    //observer.disconnect();

}

function setup() {
    console.log("setup")
    window.onload = function() {
        console.log("on load!")
        if (window.location.href = "https://trader.degiro.nl/trader/#/portfolio/assets") {
            observeDegiro()
            //scrapeDegiro()
        }
    }
    //if (window.location.hostname === "trader.degiro.nl") {
    //    scrapeDegiro()
    //}
}

  // Listen for messages from the background script
  browser.runtime.onMessage.addListener((message) => {
    if (message === "scrapeValue") {
      scrapeValue();
    }
  });

document.body.style.border = "5px solid red";

setup()
