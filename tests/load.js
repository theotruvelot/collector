import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    vus: 10,
    duration: "10s",
};

export default function () {
    const url = __ENV.TARGET_URL || "http://localhost:3000";
    const res = http.get(url);

    check(res, {
        "status is 200": (r) => r.status === 200,
    });

    sleep(1);
}
