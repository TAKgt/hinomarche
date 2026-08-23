import assert from "node:assert/strict";
import test from "node:test";
import {
  isLoopbackRequestHost,
  shouldRecordPublicMetric,
} from "./request-security";

function sameOriginRequest(host: string): Request {
  return new Request(`https://${host}/api/metrics/product-view`, {
    method: "POST",
    headers: {
      host,
      origin: `https://${host}`,
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 TestBrowser",
    },
  });
}

test("localhost・IPv4・IPv6のloopbackをポートの有無にかかわらず判定する", () => {
  for (const host of [
    "localhost",
    "localhost:3210",
    "127.0.0.1",
    "127.0.0.1:3210",
    "[::1]",
    "[::1]:3210",
  ]) {
    assert.equal(isLoopbackRequestHost(host), true);
  }
  assert.equal(isLoopbackRequestHost("hinomarche.com"), false);
});

test("production相当でもローカルQAの匿名計測は記録しない", () => {
  assert.equal(
    shouldRecordPublicMetric(
      new Request("http://127.0.0.1:3210/api/metrics/product-view", {
        method: "POST",
        headers: {
          host: "127.0.0.1:3210",
          origin: "http://127.0.0.1:3210",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 TestBrowser",
        },
      }),
      "production",
    ),
    false,
  );
});

test("productionの同一公開ホストからの通常操作は従来どおり記録対象にする", () => {
  assert.equal(
    shouldRecordPublicMetric(
      sameOriginRequest("hinomarche.com"),
      "production",
    ),
    true,
  );
});
