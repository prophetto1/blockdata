/// <reference types="astro/client" />

declare module 'virtual:starlight/user-config' {
  const config: any;
  export default config;
}

declare module 'virtual:starlight/components/*' {
  const Component: any;
  export default Component;
}
