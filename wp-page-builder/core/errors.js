export class PageBuilderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || "PAGE_BUILDER_ERROR";
    this.details = options.details || [];
    this.cause = options.cause;
  }
}

export class ValidationError extends PageBuilderError {
  constructor(message, details = []) {
    super(message, { code: "VALIDATION_ERROR", details });
  }
}

export class IntegrationError extends PageBuilderError {
  constructor(message, options = {}) {
    super(message, { code: "INTEGRATION_ERROR", ...options });
  }
}
