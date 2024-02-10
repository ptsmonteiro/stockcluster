function parseValueBourseDirect(value) {
    return parseFloat(value.replace(/[^ -~]+/g, "").replace(',', ".").match(/\d+.\d+/))
}

function observeBourseDirect() {
    console.log("Setting up observer for Bourse Direct");
    const config = { attributes: true, childList: true, subtree: true };

    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.target.tagName == 'IFRAME' && 
                mutation.target.contentDocument.URL === 'https://www.boursedirect.fr/priv/new/portefeuille-TR.php') {
                observer.disconnect();
                console.log("Scrapping Boursedirect")
                scrapeBourseDirect(mutation.target.contentDocument)
                break;
            }
        }
    }

    const observer = new MutationObserver(callback);
    observer.observe(document, config);
}

function scrapeBourseDirect(doc) {
    console.assert(doc !== undefined, "doc is undefined. shouldn't happen.")
    var positions = []

    // Available Cash
    const rows = doc.querySelectorAll('#globalTableHolder tbody tr')
    positions.push({
        'broker': 'Bourse Direct',
        'currency': 'EUR',
        'lastPriceDate': new Date().toISOString(),
        'ticker': 'CASH',
        'isin': '',
        'name': 'Available Cash',
        'qty': 1,
        'lastPrice': parseValueBourseDirect(rows[3].children[1].textContent)
    })

    // Positions
    tbody = doc.querySelectorAll("#tabPTR tbody")[1];
    for (var row of tbody.querySelectorAll("tr")) {
        td_elems = row.querySelectorAll("td");
        if (td_elems.length < 9) {
            continue
        }

        pru = td_elems[2].textContent.trim()
        if (pru.length < 1) {
            continue
        }

        position = {
            'broker': 'Bourse Direct',
            'currency': 'EUR',
            'lastPriceDate': new Date().toISOString(),
            'ticker': '',
            'isin': '',
        }
        position['breakEvenPrice'] = parseValueBourseDirect(pru)

        if (td_elems[0].children.length > 0) {
            position['name'] = td_elems[0].children[0].textContent.trim()
            tickerOrIsin = td_elems[0].children[0].href.match(/val=(\w+\:)?(\w+)/)[2]
            if (tickerOrIsin.length === 12) {
                position['isin'] = tickerOrIsin
            } else {
                position['ticker'] = tickerOrIsin
            }
        } else {
            position['name'] = td_elems[0].textContent.trim()
        }

        position['qty'] = parseInt(td_elems[1].textContent)

        cours = td_elems[3].textContent
        position['lastPrice'] = parseValueBourseDirect(cours)

        positions.push(position)
    }
    console.log(positions)
}

const urlBourseDirect = "https://www.boursedirect.fr/fr/page/portefeuille";

function parseValueDegiro(value) {
    return parseFloat(value.replace('.','').replace(',', ".").match(/\d+.\d+/))
}

function scrapeDegiro() {

    positions = [{
        'broker': 'Degiro',
        'name': 'Available Cash',
        'ticker': 'CASH',
        'qty': 1,
        'currency': 'EUR',
        'lastPrice': parseValueDegiro(document.querySelector("span[data-field='totalCash'").title),
        'lastPriceDate': new Date().toISOString(),
        'breakEvenPrice': parseValueDegiro(document.querySelector("span[data-field='totalCash'").title),
    }]

    const selector = "span[data-name='symbolIsin']"
    for (var ISINElem of document.querySelectorAll(selector)) {
        position = {
            'broker': 'Degiro',
            'name': ISINElem.closest("tr").querySelector("span[data-name='productName']").title,
            'qty': parseInt(ISINElem.closest("tr").querySelector("span[data-field='size']").title.replace('.','')),
            'currency': ISINElem.closest("tr").querySelector("td[data-field='currency']").textContent,
            'lastPrice': parseValueDegiro(ISINElem.closest("tr").querySelector("span[data-field='price']").title),
            'lastPriceDate': new Date().toISOString(),
            'breakEvenPrice': parseValueDegiro(ISINElem.closest("tr").querySelector("span[data-field='breakEvenPrice']").title),
        }

        tickerOrIsin = ISINElem.textContent.split('|')
        console.assert(tickerOrIsin.length > 0, "Ticker or ISIN not found!")
        if (tickerOrIsin.length === 2) {
            position['ticker'] = tickerOrIsin[0].trim()
            position['isin'] = tickerOrIsin[1].trim()
        } else {
            position['ticker'] = ''
            position['isin'] = tickerOrIsin[0].trim()
        }

        // Bond prices
        if (ISINElem.closest("tr").querySelector("span[data-field='price']").textContent.match(/\%/)) {
            position['lastPrice'] /= 100
            position['breakEvenPrice'] /= 100
        }

        positions.push(position)
    }

    if (positions.length > 0) {
        console.log(positions)
        browser.storage.local.set({ "positions_degiro": positions});
    }
}

function observeDegiro() {
    const config = { attributes: true, childList: true, subtree: true };

    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (document.querySelector("div[data-product-type-id='2']")) {
                scrapeDegiro()
                observer.disconnect();
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(document, config);
}

function scrapeAssuranceVie(tbody) {
    account = document.querySelector('option[selected]').textContent.match(/\D+/)[0].trim()

    positions = []

    rows = tbody.querySelectorAll('tr.results-row')
    for (row of rows) {
        var isin = row.querySelector('td.col-1').textContent.trim()
        if (isin.length === 0) {
            // Isin%253DSUR000001760
            var product_popup = row.querySelector('td.col-3 a').href
            isin = product_popup.match(/Isin\%\w{4}(\w{12})/)[1]
        }

        const name = row.querySelector('td.col-3 a').textContent.trim()

        const qty_text = row.querySelector('td.col-4').textContent.trim()
        var qty
        if (qty_text.length > 0) {
            qty = parseFloat(row.querySelector('td.col-4').textContent.replace(',','.'))
        } else {
            qty = 1
        }

        var lastPriceDate
        date_parts = row.querySelector('td.col-5').textContent.split('/')
        if (date_parts.length === 3) {
            lastPriceDate = new Date(date_parts[2], date_parts[1]-1, date_parts[0])
        } else {
            lastPriceDate = new Date()
        }
        
        const lastPriceText = row.querySelector('td.col-6').textContent.trim()
        const breakEvenPriceText = row.querySelector('td.col-7').textContent.trim()
        const totalText = row.querySelector('td.col-9').textContent.trim()

        var lastPrice, breakEvenPrice
        if (lastPriceText.length < 1) {
            lastPrice = parseValueBourseDirect(totalText)
            breakEvenPrice = parseValueBourseDirect(totalText)
        } else {
            lastPrice = parseValueBourseDirect(lastPriceText)
            breakEvenPrice = parseValueBourseDirect(breakEvenPriceText)    
        }

        positions.push({
            'broker': account,
            'isin': isin,
            'ticker': '',
            'name': name,
            'qty': qty,
            'currency': 'EUR',
            'lastPrice': lastPrice,
            'lastPriceDate': lastPriceDate,
            'breakEvenPrice': breakEvenPrice,
        })
    }
    console.log(positions)
}

function setup() {
    console.log("setup")

    // Degiro
    if (window.location.href == "https://trader.degiro.nl/trader/#/portfolio/assets") {
            console.log("Observing Degiro")
            observeDegiro()
    }

    // Bourse Direct
    if (window.location.href == urlBourseDirect) {
        console.log("Observing BourseDirect")
        observeBourseDirect()
    }   

    // AssuranceVie
    if (window.location.href.includes('action=detailContrat')) {
        const x = document.querySelector('tbody.table-data td.col-9')
        if (x) {
            console.log("Scraping AssuranceVie")
            scrapeAssuranceVie(x.closest('tbody'))
        }
    }

}

  // Listen for messages from the background script
  browser.runtime.onMessage.addListener((message) => {
    if (message === "scrapeValue") {
      scrapeValue();
    }
  });

document.body.style.border = "5px solid red";

setup()
