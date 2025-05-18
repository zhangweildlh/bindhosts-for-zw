# Translation Guide

## WebUI

- [Contribute to WebUI localization](https://github.com/bindhosts/bindhosts/new/master/module/webroot/locales)

### Update Existing Translation

1. Find your language string file in `module/webroot/locales/strings`.
2. Edit the string value that translated incorrectly or add missing translation field.
3. Make a Pull Request.

### Add a New Language

1. Copy `module/webroot/locales/template.xml` to strings folder.
2. Rename it to `language_code.xml` or `language_code-REGION_CODE.xml`, e.g., `en.xml` or `zh-CN.xml`.
3. Translate the string value inside.
4. Add the language to `module/webui/locales/languages.json`, this step is necessary for displaying your language in WebUI.
5. Make a Pull Request.

---

## Documentation

- [Contribute to document localization](https://github.com/bindhosts/bindhosts/new/master/Documentation)

### Available documentations

- [README.md](https://github.com/bindhosts/bindhosts/blob/master/README.md)
- [hiding.md](https://github.com/bindhosts/bindhosts/blob/master/Documentation/hiding.md)
- [modes.md](https://github.com/bindhosts/bindhosts/blob/master/Documentation/modes.md)
- [usage.md](https://github.com/bindhosts/bindhosts/blob/master/Documentation/usage.md)
- [faq.md](https://github.com/bindhosts/bindhosts/blob/master/Documentation/faq.md)

### Document name 

- Document names' format are required to conform precisely to the given example here.
- Format: <br>`DOCNAME_language_code.md` or `DOCNAME_language_code-REGION_CODE.md`
- The language surfix must be exacly same with the translation strings file name.
