import { Injectable } from "@nestjs/common";
import { TossClient } from "./clients/toss/toss.client";

/**
 * @deprecated 하위 호환성을 위해 유지됩니다. TossClient 사용을 권장합니다.
 */
@Injectable()
export class TossApiService extends TossClient {}
