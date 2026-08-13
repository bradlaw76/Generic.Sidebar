export const SYNTHETIC_CONFIG_ID = "11111111-1111-4111-8111-111111111111";
export const SYNTHETIC_CLIENT_URL = "https://contoso.crm.dynamics.com";

export function createSidebarConfig(overrides = {}) {
  return {
    sidebar_title1: "Primary",
    sidebar_instructions: "",
    sidebar_embedcode: "https://example.test/app",
    sidebar_title2: "",
    sidebar_instructions2: "",
    sidebar_embedcode2: "",
    sidebar_title3: "",
    sidebar_instructions3: "",
    sidebar_embedcode3: "",
    sidebar_title4: "",
    sidebar_instructions4: "",
    sidebar_embedcode4: "",
    sidebar_agentmenutab: null,
    sidebar_iframewidth: null,
    sidebar_iframeheight: null,
    sidebar_iframestyle: null,
    sidebar_iframeallow: null,
    sidebar_primarycolor: null,
    sidebar_textcolor: null,
    sidebar_linkcolor: null,
    sidebar_filetype: null,
    ...overrides,
  };
}