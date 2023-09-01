let websocket = null,
    pluginUUID = null,
    apiKey = "",
    provider = "";

function connectElgatoStreamDeckSocket(
    inPort,
    inPluginUUID,
    inRegisterEvent,
    inInfo
) {
    pluginUUID = inPluginUUID;

    // Open the web socket
    websocket = new WebSocket("ws://localhost:" + inPort);

    websocket.onopen = function () {
        // WebSocket is connected, register the plugin
        const json = {
            event: inRegisterEvent,
            uuid: inPluginUUID,
        };

        websocket.send(JSON.stringify(json));
    };

    websocket.onmessage = function (evt) {
        // Received message from Stream Deck
        const jsonObj = JSON.parse(evt.data);
        const context = jsonObj["context"];

        if (jsonObj["event"] === "keyUp") {
            let frequency = null;
            if (
                jsonObj.payload.settings != null &&
                jsonObj.payload.settings.hasOwnProperty("frequency")

            ) {
                frequency =
                    jsonObj.payload.settings["frequency"] !== "0"
                        ? parseInt(jsonObj.payload.settings["frequency"])
                        : false;
            }

            if (apiKey === "") {
                const json = {
                    event: "showAlert",
                    context: jsonObj.context,
                };
                websocket.send(JSON.stringify(json));
            }else{
                sendRequest(context, apiKey)
            }
        } else if (jsonObj["event"] === "didReceiveGlobalSettings") {
            if (
                jsonObj.payload.settings != null &&
                jsonObj.payload.settings.hasOwnProperty("apiKey")
            ) {
                apiKey = jsonObj.payload.settings["apiKey"];
            }
        } else if (jsonObj["event"] === "keyDown") {
            const json = {
                event: "getGlobalSettings",
                context: pluginUUID,
            };
            websocket.send(JSON.stringify(json));
        }
    };
}

function getToken(apiKey){
    return new Promise((resolve,reject) => {
        const request = new XMLHttpRequest();
        const url = 'https://digital.iservices.rte-france.com/token/oauth/'
        const token = "Basic "+apiKey;
    
        request.open("GET", url);
        request.setRequestHeader("Authorization",token)
        request.send();
    
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    const response = JSON.parse(request.responseText);
                    resolve(response)
                } else {
                    const json = {
                        event: "showAlert",
                        context,
                    };
                    websocket.send(JSON.stringify(json));
                    reject("error")
                }
            }
        };
    })

}

async function sendRequest(context, apiKey) {
    const response =  await getToken(apiKey); 
    const request = new XMLHttpRequest();
    const token = response.token_type+" "+ response.access_token
    const url = 'https://digital.iservices.rte-france.com/open_api/tempo_like_supply_contract/v1/tempo_like_calendars';
    let title;
    request.open("GET", url);
    request.setRequestHeader("Authorization", token)
    request.send();
    request.onreadystatechange = function () {
        if (request.readyState === XMLHttpRequest.DONE) {
            if (request.status === 200) {
                const response = JSON.parse(request.responseText);
                const color = response.tempo_like_calendars.values[0].value
                switch (color) {
                    case "BLUE":
                         title = "BLEU";
                         image =  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAANQTFRFAAD/injSVwAAABlJREFUeJxjYBgFo2AUjIJRMApGwSigLwAACIAAAVW2ZPgAAAAASUVORK5CYII=";
                        break;

                    case "WHITE":
                         title = "BLANC";
                         image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAANQTFRF////p8QbyAAAABlJREFUeJxjYBgFo2AUjIJRMApGwSigLwAACIAAAVW2ZPgAAAAASUVORK5CYII=";
                        break;

                    case "RED":
                        title = "ROUGE";
                        image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAANQTFRF/wAAGeIJNwAAABlJREFUeJxjYBgFo2AUjIJRMApGwSigLwAACIAAAVW2ZPgAAAAASUVORK5CYII=";
                        break;
                
                    default:
                        title = "WHITE";
                        image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAANQTFRF////p8QbyAAAABlJREFUeJxjYBgFo2AUjIJRMApGwSigLwAACIAAAVW2ZPgAAAAASUVORK5CYII=";
                        break;
                }
                let jsonDeck = {
                    event: "setTitle",
                    context,
                    payload: {
                        title: title,
                    },
                };

                let colorDeck = {
                    event: "setImage",
                    context,
                    payload: {
                        image,
                    }
                }

                websocket.send(JSON.stringify(jsonDeck));
                websocket.send(JSON.stringify(colorDeck));

            } else {
                const json = {
                    event: "showAlert",
                    context,
                };
                websocket.send(JSON.stringify(json));
            }
        }
    };
}