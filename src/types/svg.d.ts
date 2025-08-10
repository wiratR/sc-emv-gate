declare module "*.svg?react" {
  import * as React from "react";
  const Component: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default Component;
}
declare module "*.svg?url" {
  const src: string;
  export default src;
}