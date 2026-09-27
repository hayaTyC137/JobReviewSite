/** Ошибка API в едином формате (см. ApiError.java на бэкенде) */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Бэкенд не отвечает — переключаемся на демо-данные */
export class BackendUnavailableError extends Error {}
