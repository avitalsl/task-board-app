// checkReset orchestrates periods + scoring + tasks but is tightly coupled
// to private helpers in periods/service. Re-exported here to establish the
// application-layer import boundary; logic moves in a future step.
export { checkReset } from '../domains/periods/service';
