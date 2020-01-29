/**
 * Created by Jonathan on 2/14/18.
 */

window.addEventListener('load', main, false);

const isDev = true;
const Events = {
    FULL_SCREEN: 0,
    REGULAR_SCREEN: 1
}

let originalStyle = undefined;

function main() {
    try {

        let productTitle
        if (document.getElementById('productTitle'))
            productTitle = document.getElementById('productTitle').innerText.trim();

        let brand = document.getElementById('bylineInfo');
        if (brand == null) {
            // Try with another id
            brand = document.getElementById('brand');
        }

        if (brand) {
            brand = brand.innerText.trim();
        }

        //Get the ASIN number from the URL
        let asin = null;

        let dp = window.location.href.indexOf('dp/')
        if (dp >= 0) {
            let start = window.location.href.substr(dp + 3)
            let indexNextSlash = start.indexOf('/')
            asin = start.substr(0, indexNextSlash)
        }

        if (!asin && document.getElementById('prodDetails')) {

            try {
                let tableStrings = Array.from(document.getElementById('prodDetails')
                    .querySelectorAll('th, td'))
                    .map(element => element.innerText);
                asin = tableStrings[tableStrings.indexOf('ASIN') + 1];
            } catch (e) {
            }
        }

        if (!asin && document.getElementById('detail-bullets')) {
            try {
                let liObjects = Array.prototype.slice.call(document.getElementById('detail-bullets').querySelectorAll('li'));
                let liAsinNumberElement = liObjects.find(li => li.lastElementChild.lastChild.data.includes("ASIN"));
                asin = liAsinNumberElement.lastElementChild.nextSibling.data;
            } catch (e) {
            }
        }

        if (productTitle && brand && asin) {
            console.log('recall.it Browser Extension Started');
            const iframe = document.createElement('iframe');
            let source = 'https://recall-oz.com';
            if (isDev === true)
                source = 'https://localhost:3000';

            iframe.setAttribute('style', 'position:fixed;bottom:0;z-index:99999;border:none;left:20px;bottom:20px;');
            iframe.setAttribute('allowFullScreen', '');
            iframe.src = `${source}/iframe?productTitle=${productTitle}&brand=${brand}&asin=${asin}`;

            if (isDev)
                console.log('recall.it', iframe.src);

            document.body.appendChild(iframe);
            window.iFrameResize({
                log: false,
                sizeWidth: true,
                resizeFrom: 'parent',
                messageCallback: function (messageData) {
                    switch (messageData.message) {
                        case Events.FULL_SCREEN:
                            originalStyle = messageData.iframe.getAttribute('style')
                            messageData.iframe.style = 'position: fixed;\n' +
                                '    z-index: 99999;\n' +
                                '    border: none;\n' +
                                '    left: 0px;\n' +
                                '    right: 0px;\n' +
                                '    bottom: 0px;\n' +
                                '    top: 0;\n' +
                                '    height: 100%;\n' +
                                '    width: 100%;'

                            break;
                        case Events.REGULAR_SCREEN:
                            messageData.iframe.style = originalStyle
                            break;
                        default:
                            console.log('Undefined event ', messageData)
                    }
                }
            }, iframe);
        }
    } catch
        (e) {
        console.log('recall.it:BE Error\t', e.message);
        console.log(e.stack);
        // todo: Send this back to the server so we can monitor errors
    }

}
