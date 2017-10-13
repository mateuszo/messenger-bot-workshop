const request = require('request');
const express = require('express')
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function (req, res) {
  res.send('Hello World!')
});

app.get('/webhook', function(req, res){
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === "Codecool is cool") {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;


  if(messageText=='magic'){
    sendStructuredMessage(senderID);
  } else {
    echo(senderID, messageText);
  }

}

function echo(recipientId, messageText){
  // Construct reply message
  var echo = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(echo);
}


function sendStructuredMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Codecool",
            subtitle: "The best programming school",
            item_url: "https://codecool.pl/",
            image_url: "https://crossweb.pl/job/wp-content/uploads/2016/06/codecool.png",
            buttons: [{
              type: "web_url",
              url: "https://codecool.pl/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback One", // button text
              payload: "Payload for first bubble", // postback body
            }],
          }, {
            title: "DevCamp",
            subtitle: "The best IT event",
            item_url: "http://devcamp.pl/",
            image_url: "https://d1ll4kxfi4ofbm.cloudfront.net/images/621921/3af0f2b904c54475f17a7919b166e900.png",
            buttons: [{
              type: "web_url",
              url: "http://devcamp.pl/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback Two",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}


function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'EAAD9lWOUdi8BAIXbZC6SSWxzmHEM8cgTHJZCtibTsrJ1qCL9Dhk78Xgy8vbnG9XEiBCLQUBBIDJRKY7QxOYHnQM6CLAQpPawMYrbmPBIrJSbaMbKOd78n24n7aMu78cnnJinT2qxZCZCPWQ79EDVnMLRMZC9EVhZBZBc1e9dZABFpgZDZD' },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
