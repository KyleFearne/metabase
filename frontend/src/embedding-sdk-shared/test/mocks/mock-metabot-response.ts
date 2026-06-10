import { http } from "msw";

export const MOCK_AD_HOC_QUESTION_ID =
  "/question#eyJkYXRhc2V0X3F1ZXJ5IjogeyJkYXRhYmFzZSI6IDEsICJ0eXBlIjogInF1ZXJ5IiwgInF1ZXJ5IjogeyJzb3VyY2UtdGFibGUiOiAiY2FyZF9fMSJ9fSwgImRpc3BsYXkiOiAidGFibGUiLCAiZGlzcGxheUlzTG9ja2VkIjogdHJ1ZSwgInZpc3VhbGl6YXRpb25fc2V0dGluZ3MiOiB7fX0=";

export const MOCK_AD_HOC_DATASET_QUERY = {
  database: 1,
  type: "query",
  query: { "source-table": "card__1" },
};

export const mockGeneratedCardChunk = (
  datasetQuery: unknown = MOCK_AD_HOC_DATASET_QUERY,
  {
    title = "Question",
    display = "table",
  }: { title?: string; display?: string } = {},
) =>
  `2:${JSON.stringify({
    type: "generated_entity",
    version: 1,
    value: {
      type: "card",
      id: "card-1",
      title,
      query: { id: "query-1", query: datasetQuery },
      display,
    },
  })}`;

export const mockStreamResponse = (chunks: string[]) => {
  return http.post("*/api/metabot/agent-streaming", () => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let i = 0;

        const pushNext = () => {
          if (i < chunks.length) {
            controller.enqueue(encoder.encode(`${chunks[i]}\n`));
            i++;
            setTimeout(pushNext, 100);
          } else {
            controller.close();
          }
        };

        pushNext();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  });
};
