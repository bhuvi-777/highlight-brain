# Highlight Brain

Highlight Brain is a Chrome Manifest V3 extension that explains, translates, or breaks down selected text with Google Gemini.

## Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In Chrome, open `chrome://extensions` and turn on **Developer mode**.
3. Choose **Load unpacked** and select this extension folder.
4. Open the extension's **Details** page, then choose **Extension options**.
5. Paste your API key, review the model and response preferences, then click **Test connection** or **Save settings**.
6. Refresh any webpage you want to use, select text, and choose **Explain**, **Translate**, or **Code breakdown**. The Code breakdown button is enabled by default and can be hidden in settings; Explain still recognizes code selections. The Explain card also has a **More detail** action.

## Notes

- The API key is stored in Chrome's local extension storage and sent to Google's Gemini API when you request an answer. Don't share your key.
- The default model is `gemini-3.5-flash-lite`, Google's low-latency, cost-efficient Flash-Lite model. Change it in settings if needed for your API key.
- The optional field override is blank by default. Leave it blank to let Explain infer the field from the page and surrounding text.
- Chrome restricts extensions on some internal pages, the Chrome Web Store, and other protected pages. Highlight Brain works on regular webpages where Chrome permits content scripts.
