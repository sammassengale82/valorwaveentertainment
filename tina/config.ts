import { Tina } from "tinacms";

const tinaConfig = {
  // The local root file containing your content
  local: {
    preview: {
      // Path to your index.html file
      path: "index.html",
    },
  },
  // Your content model definitions
  models: [
    {
      name: "page",
      fields: [
        {
          type: "textarea",
          name: "textContent",
          label: "Text Content",
        },
        {
          type: "image",
          name: "image",
          label: "Image",
        },
        {
          type: "color",
          name: "color",
          label: "Color",
        },
        {
          type: "boolean",
          name: "visible",
          label: "Visible",
        },
      ],
    },
  ],
};

export default tinaConfig;