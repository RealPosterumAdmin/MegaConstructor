import type { ClassType, Severity, StepType, StructureKind } from '../../types'

const STEP_TYPE_LABELS: Record<StepType, string> = {
  receive_input: 'Получить входные данные',
  validate: 'Проверить данные',
  map_data: 'Преобразовать данные',
  call_method: 'Вызвать метод',
  call_class: 'Вызвать класс',
  conditional: 'Условие',
  loop: 'Цикл',
  manual_action: 'Ручное действие',
  log: 'Логирование',
  save_to_db: 'Сохранить в БД',
  call_api: 'Вызвать API',
  build_response: 'Собрать ответ',
  throw_error: 'Вернуть ошибку',
  return_result: 'Вернуть результат',
}

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  controller: 'Контроллер',
  service: 'Сервис',
  repository: 'Репозиторий',
  validator: 'Валидатор',
  utility: 'Утилита',
}

const STRUCTURE_KIND_LABELS: Record<StructureKind, string> = {
  primitive: 'Примитив',
  object: 'Объект',
  array: 'Массив',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Критично',
  warning: 'Предупреждение',
  info: 'Информация',
}

const VISIBILITY_LABELS = {
  public: 'Публичный',
  protected: 'Защищённый',
  private: 'Приватный',
} as const

const LOG_LEVEL_LABELS = {
  debug: 'Отладка',
  info: 'Информация',
  warn: 'Предупреждение',
  error: 'Ошибка',
} as const

export const stepTypeLabel = (type: StepType) => STEP_TYPE_LABELS[type]

export const classTypeLabel = (type: ClassType) => CLASS_TYPE_LABELS[type]

export const structureKindLabel = (type: StructureKind) => STRUCTURE_KIND_LABELS[type]

export const severityLabel = (severity: Severity) => SEVERITY_LABELS[severity]

export const visibilityLabel = (visibility: keyof typeof VISIBILITY_LABELS) => VISIBILITY_LABELS[visibility]

export const logLevelLabel = (level: keyof typeof LOG_LEVEL_LABELS) => LOG_LEVEL_LABELS[level]
