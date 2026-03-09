import type {UserConfig} from "@hey-api/openapi-ts";
import * as path from "path";
import {fileURLToPath} from "url";
import {defineKestraHeyConfig} from "../../web-kt/heyapi-sdk-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const generateHash = (str: string) => {
  let hash = 0;
  for (const char of str) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return hash.toString(16).replace("-", "0");
};

export default {
  input: path.resolve(__dirname, "../../openapi.yml"),
  output: {
    path: path.resolve(__dirname, "../generated/kestra-api"),
    postProcess: ["eslint"],
  },
  plugins: [
    {
      name: "@hey-api/client-axios",
    },
    {
      name: "@hey-api/sdk",
      paramsStructure: "flat",
      operations: {
        methodName(operation) {
          return `__${generateHash(operation)}__`;
        },
      },
    },
    defineKestraHeyConfig(),
  ],
} satisfies UserConfig;
