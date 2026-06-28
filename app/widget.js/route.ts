import { widgetLoaderResponse } from "@/lib/widget-loader";

export function GET(request: Request) {
  return widgetLoaderResponse(request);
}
