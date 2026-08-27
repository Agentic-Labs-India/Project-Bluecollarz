export type ActionFailure = {
  ok: false;
  error: string;
  code?: string;
};

export type ActionSuccess<T extends object> = { ok: true } & T;

export type ActionResult<T extends object = Record<string, never>> =
  | ActionSuccess<T>
  | ActionFailure;

export function actionOk<T extends object>(data: T): ActionSuccess<T> {
  return { ok: true, ...data };
}

export function actionFail(error: string, code?: string): ActionFailure {
  return code ? { ok: false, error, code } : { ok: false, error };
}
