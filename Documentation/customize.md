# WebUI customization

- Configuration path: `/data/adb/bindhosts/.webui_config`

## Custom Styling

> [!WARNING]
> Using `custom.css` will overwrite monet theme in MMRL too!
- Customize WebUI styling in custom.css
- Remove remark `/* */` to take effect
- Example changing main theme color to green:
  ```css
  :root {
      /* Background colors */
      --bg-primary: #F0FFF0;
      --bg-secondary: #A8E4A0;

      /* Button colors */
      --btn-primary: #48A860;
  }
  ```

### Custom Background

- Copy your custom wallpaper into configuration path and rename it into `custom_background.`jpg/png/webp
- Use `.translucent` and `.translucent-menu` in `custom.css` for better effect.
- To make the card translucent, you can simply adjust the alpha value in background color.
  ```css
  .translucent, .translucent-menu {
    background-color: rgba(0, 0, 0, 0.5); /* 0.5 is semi-transparent */
    /* 0 ~ 1 transparent to opaque */

    /* Optional blur intensity */
    backdrop-filter: blur(3px);
  }
  ```
- More info in `custom.css`.
