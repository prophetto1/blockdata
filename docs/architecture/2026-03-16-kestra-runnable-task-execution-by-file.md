# Kestra RunnableTask Execution — By File

---

## File 1: `JdbcExecutor.java`

`jdbc/src/main/java/io/kestra/jdbc/runner/JdbcExecutor.java`

The orchestrator. Receives executions from the queue, resolves next tasks, dispatches to workers, receives results, loops.

| |
|---|
| **:641** `executor = executorService.process(executor);` |
| **:643** `if (!executor.getNexts().isEmpty() && deduplicateNexts(execution, executorState, executor.getNexts())) {` |
| **:645** `executorService.onNexts(executor.getExecution(), executor.getNexts()),` |
| **:657** `.forEach(throwConsumer(workerTask -> {` |
| **:659** `if (!TruthUtils.isTruthy(workerTask.getRunContext().render(workerTask.getTask().getRunIf()))) {` |
| **:660** `workerTaskResults.add(new WorkerTaskResult(workerTask.getTaskRun().withState(State.Type.SKIPPED).addAttempt(TaskRunAttempt.builder().state(new State().withState(State.Type.SKIPPED)).build())));` |
| **:662** `if (workerTask.getTask().isSendToWorkerTask()) {` |
| **:663** `Optional<WorkerGroup> maybeWorkerGroup = workerGroupService.resolveGroupFromJob(flow, workerTask);` |
| **:664** `String workerGroupKey = maybeWorkerGroup.map(throwFunction(workerGroup -> workerTask.getRunContext().render(workerGroup.getKey()))).orElse(null);` |
| **:666** `if (workerTask.getTask() instanceof WorkingDirectory) {` |
| **:668** `workerJobQueue.emit(workerGroupKey, workerTask);` |
| **:669** `} else {` |
| **:670** `TaskRun taskRun = workerTask.getTaskRun().withState(State.Type.SUBMITTED);` |
| **:671** `workerJobQueue.emit(workerGroupKey, workerTask.withTaskRun(taskRun));` |
| **:672** `workerTaskResults.add(new WorkerTaskResult(taskRun));` |
| **:676** `if (workerTask.getTask().isFlowable()) {` |
| **:677** `TaskRun updatedTaskRun = workerTask.getTaskRun()` |
| **:678** `.withAttempts(` |
| **:679** `List.of(` |
| **:680** `TaskRunAttempt.builder()` |
| **:681** `.state(new State().withState(State.Type.RUNNING))` |
| **:682** `.build()` |
| **:685** `.withState(State.Type.RUNNING);` |
| **:687** `workerTaskResults.add(new WorkerTaskResult(updatedTaskRun));` |
| **:690** `} catch (Exception e) {` |
| **:691** `workerTaskResults.add(new WorkerTaskResult(workerTask.getTaskRun().withState(State.Type.FAILED)));` |
| **:697** `executorService.addWorkerTaskResults(executor, workerTaskResults);` |
| **:789** `private void workerTaskResultQueue(Either<WorkerTaskResult, DeserializationException> either) {` |
| **:795** `WorkerTaskResult message = either.getLeft();` |
| **:806** `Executor executor = executionRepository.lock(message.getTaskRun().getExecutionId(), pair -> {` |
| **:807** `Execution execution = pair.getLeft();` |
| **:808** `Executor current = new Executor(execution, null);` |
| **:814** `if (execution.hasTaskRunJoinable(message.getTaskRun())) {` |
| **:817** `executorService.addWorkerTaskResult(current, throwSupplier(() -> findFlowOrThrow(execution)), message);` |
| **:848** `this.toExecution(executor);` |

---

## File 2: `DefaultWorker.java`

`worker/src/main/java/io/kestra/worker/DefaultWorker.java`

The worker process. Subscribes to the job queue, receives tasks, calls `run()`, emits results back.

### Queue subscription

| |
|---|
| **:272** `this.receiveCancellations.addFirst(this.workerJobQueue.subscribe(` |
| **:273** `this.id,` |
| **:274** `this.workerGroup,` |
| **:275** `either -> {` |
| **:276** `pendingJobCount.incrementAndGet();` |
| **:277** `executorService.execute(() -> {` |
| **:278** `pendingJobCount.decrementAndGet();` |
| **:279** `runningJobCount.incrementAndGet();` |
| **:288** `WorkerJob workerTask = either.getLeft();` |
| **:289** `if (workerTask instanceof WorkerTask task) {` |
| **:290** `handleTask(task);` |
| **:291** `} else if (workerTask instanceof WorkerTrigger trigger) {` |
| **:292** `handleTrigger(trigger);` |

### Task routing

| |
|---|
| **:369** `private void handleTask(final WorkerTask workerTask) {` |
| **:370** `if (workerTask.getTask() instanceof RunnableTask) {` |
| **:371** `this.run(workerTask, true);` |
| **:372** `} else if (workerTask.getTask() instanceof WorkingDirectory workingDirectory) {` |

### Main execution: `run()`

| |
|---|
| **:645** `private WorkerTaskResult run(WorkerTask workerTask, Boolean cleanUp) {` |
| **:650** `if (workerTask.getTaskRun().getState().getCurrent() == CREATED) {` |
| **:658** `if (!Boolean.TRUE.equals(workerTask.getTaskRun().getForceExecution()) && killedExecution.contains(workerTask.getTaskRun().getExecutionId())) {` |
| **:659** `WorkerTaskResult workerTaskResult = new WorkerTaskResult(workerTask.getTaskRun().withState(KILLED));` |
| **:661** `this.workerTaskResultQueue.emit(workerTaskResult);` |
| **:674** `Logs.logTaskRun(` |
| **:675** `workerTask.getTaskRun(),` |
| **:676** `Level.INFO,` |
| **:677** `"Type {} started",` |
| **:678** `workerTask.getTask().getClass().getSimpleName()` |
| **:679** `);` |
| **:681** `workerTask = workerTask.withTaskRun(workerTask.getTaskRun().withState(RUNNING));` |
| **:683** `DefaultRunContext runContext = runContextInitializer.forWorker((DefaultRunContext) workerTask.getRunContext(), workerTask);` |
| **:685** `if (workerTask.getTask().getTaskCache() != null && workerTask.getTask().getTaskCache().getEnabled()) {` |
| **:688** `hash = hashTask(runContext, workerTask.getTask());` |
| **:690** `Optional<InputStream> cacheFile = runContext.storage().getCacheFile(hash.get(), workerTask.getTaskRun().getValue(), workerTask.getTask().getTaskCache().getTtl());` |
| **:720** `workerTask = this.runAttempt(runContext, workerTask);` |
| **:723** `TaskRunAttempt lastAttempt = workerTask.getTaskRun().lastAttempt();` |
| **:729** `io.kestra.core.models.flows.State.Type state = lastAttempt.getState().getCurrent();` |
| **:731** `if (shutdown.get() && serverConfig.workerTaskRestartStrategy() != WorkerTaskRestartStrategy.NEVER && state.isFailed()) {` |
| **:734** `List<WorkerTaskResult> dynamicWorkerResults = workerTask.getRunContext().dynamicWorkerResults();` |
| **:735** `List<TaskRun> dynamicTaskRuns = dynamicWorkerResults(dynamicWorkerResults);` |
| **:736** `return new WorkerTaskResult(workerTask.getTaskRun(), dynamicTaskRuns);` |
| **:739** `if (workerTask.getTask().getRetry() != null && workerTask.getTask().getRetry().getWarningOnRetry() && workerTask.getTaskRun().attemptNumber() > 1 && state == SUCCESS) {` |
| **:744** `state = WARNING;` |
| **:747** `if (workerTask.getTask().isAllowFailure() && !workerTask.getTaskRun().shouldBeRetried(workerTask.getTask().getRetry()) && state.isFailed()) {` |
| **:748** `state = WARNING;` |
| **:751** `if (workerTask.getTask().isAllowWarning() && WARNING.equals(state)) {` |
| **:752** `state = SUCCESS;` |
| **:756** `List<WorkerTaskResult> dynamicWorkerResults = workerTask.getRunContext().dynamicWorkerResults();` |
| **:757** `List<TaskRun> dynamicTaskRuns = dynamicWorkerResults(dynamicWorkerResults);` |
| **:759** `workerTask = workerTask.withTaskRun(workerTask.getTaskRun().withState(state));` |
| **:761** `WorkerTaskResult workerTaskResult = new WorkerTaskResult(workerTask.getTaskRun(), dynamicTaskRuns);` |
| **:763** `this.workerTaskResultQueue.emit(workerTaskResult);` |
| **:766** `if (workerTask.getTask().getTaskCache() != null && workerTask.getTask().getTaskCache().getEnabled() && hash.isPresent() &&` |
| **:767** `(state == State.Type.SUCCESS \|\| state == State.Type.WARNING)) {` |
| **:774** `archive.write(JacksonMapper.ofIon().writeValueAsBytes(workerTask.getTaskRun().getOutputs()));` |
| **:777** `Path archiveFile = runContext.workingDir().createTempFile(".zip");` |
| **:778** `Files.write(archiveFile, bos.toByteArray());` |
| **:779** `URI uri = runContext.storage().putCacheFile(archiveFile.toFile(), hash.get(), workerTask.getTaskRun().getValue());` |
| **:786** `return workerTaskResult;` |
| **:787** `} catch (QueueException e) {` |
| **:790** `TaskRun failed = workerTask.fail();` |
| **:791** `if (e instanceof MessageTooBigException) {` |
| **:793** `failed = failed.withOutputs(Variables.empty());` |

### Attempt execution: `runAttempt()`

| |
|---|
| **:893** `private WorkerTask runAttempt(RunContext runContext, final WorkerTask workerTask) throws QueueException {` |
| **:894** `Logger logger = runContext.logger();` |
| **:896** `if (!(workerTask.getTask() instanceof RunnableTask<?> task)) {` |
| **:910** `TaskRunAttempt.TaskRunAttemptBuilder builder = TaskRunAttempt.builder()` |
| **:911** `.state(new io.kestra.core.models.flows.State().withState(RUNNING))` |
| **:912** `.workerId(this.id);` |
| **:915** `this.workerTaskResultQueue.emit(new WorkerTaskResult(` |
| **:916** `workerTask.getTaskRun()` |
| **:917** `.withAttempts(this.addAttempt(workerTask, builder.build()))` |
| **:918** `)` |
| **:919** `);` |
| **:925** `WorkerTaskCallable workerTaskCallable = new WorkerTaskCallable(workerTask, task, runContext, metricRegistry);` |
| **:926** `io.kestra.core.models.flows.State.Type state = callJob(workerTaskCallable);` |
| **:931** `TaskRunAttempt taskRunAttempt = builder` |
| **:932** `.build()` |
| **:933** `.withState(state)` |
| **:934** `.withLogFile(runContext.logFileURI());` |
| **:937** `runContext.metrics().forEach(metric -> {` |
| **:939** `this.metricEntryQueue.emit(MetricEntry.of(workerTask.getTaskRun(), metric, workerTask.getExecutionKind()));` |
| **:946** `List<TaskRunAttempt> attempts = this.addAttempt(workerTask, taskRunAttempt);` |
| **:948** `TaskRun taskRun = workerTask.getTaskRun()` |
| **:949** `.withAttempts(attempts);` |
| **:952** `Variables variables = variablesService.of(StorageContext.forTask(taskRun), workerTaskCallable.getTaskOutput());` |
| **:953** `taskRun = taskRun.withOutputs(variables);` |
| **:954** `if (workerTask.getTask().getAssets() != null) {` |
| **:956** `Map<String, Object> formattedOutputsMap = RunVariables.executionFormattedOutputMap(taskRun);` |
| **:958** `List<AssetEmit> assetEmits = runContext.assets().emitted();` |
| **:959** `AssetsDeclaration assetsDeclaration = workerTask.getTask().getAssets();` |
| **:960** `taskRun = taskRun.withAssets(new AssetsInOut(` |
| **:962** `runContext.render(assetsDeclaration.getInputs()).asList(AssetIdentifier.class, formattedOutputsMap).stream(),` |
| **:963** `assetEmits.stream().map(AssetEmit::inputs).flatMap(Collection::stream)` |
| **:966** `runContext.render(assetsDeclaration.getOutputs()).asList(Asset.class, formattedOutputsMap).stream(),` |
| **:967** `assetEmits.stream().map(AssetEmit::outputs).flatMap(Collection::stream)` |
| **:975** `return workerTask` |
| **:976** `.withTaskRun(taskRun);` |

### callJob()

| |
|---|
| **:979** `private io.kestra.core.models.flows.State.Type callJob(AbstractWorkerCallable workerJobCallable) {` |
| **:980** `synchronized (this) {` |
| **:981** `workerCallableReferences.add(workerJobCallable);` |
| **:985** `return tracer.inCurrentContext(` |
| **:986** `workerJobCallable.runContext,` |
| **:987** `workerJobCallable.getType(),` |
| **:988** `Attributes.of(TraceUtils.ATTR_UID, workerJobCallable.getUid()),` |
| **:989** `() -> workerSecurityService.callInSecurityContext(workerJobCallable)` |
| **:990** `);` |
| **:991** `} catch (Exception e) {` |
| **:994** `workerJobCallable.exception = e;` |
| **:995** `return State.Type.FAILED;` |
| **:997** `synchronized (this) {` |
| **:998** `workerCallableReferences.remove(workerJobCallable);` |

---

## File 3: `WorkerTaskCallable.java`

`worker/src/main/java/io/kestra/worker/WorkerTaskCallable.java`

The innermost layer. Calls `task.run(runContext)`. 96 lines total.

| |
|---|
| **:19** `public class WorkerTaskCallable extends AbstractWorkerCallable {` |
| **:20** `RunnableTask<?> task;` |
| **:21** `MetricRegistry metricRegistry;` |
| **:24** `WorkerTask workerTask;` |
| **:27** `Output taskOutput;` |
| **:29** `WorkerTaskCallable(WorkerTask workerTask, RunnableTask<?> task, RunContext runContext, MetricRegistry metricRegistry) {` |
| **:30** `super(runContext, task.getClass().getName(), workerTask.uid(), task.getClass().getClassLoader());` |
| **:37** `public void signalStop() {` |
| **:39** `task.stop();` |
| **:46** `protected void kill(final boolean markAsKilled) {` |
| **:48** `task.kill();` |
| **:57** `public State.Type doCall() throws Exception {` |
| **:58** `final Duration workerTaskTimeout = workerTask.getRunContext().render(workerTask.getTask().getTimeout()).as(Duration.class).orElse(null);` |
| **:61** `if (workerTaskTimeout != null) {` |
| **:62** `Timeout<Object> taskTimeout = Timeout` |
| **:63** `.builder(workerTaskTimeout)` |
| **:64** `.withInterrupt()` |
| **:65** `.build();` |
| **:66** `Failsafe` |
| **:67** `.with(taskTimeout)` |
| **:79** `.run(() -> taskOutput = task.run(runContext));` |
| **:81** `taskOutput = task.run(runContext);` |
| **:84** `if (taskOutput != null && taskOutput.finalState().isPresent()) {` |
| **:85** `return taskOutput.finalState().get();` |
| **:87** `return SUCCESS;` |
| **:88** `} catch (dev.failsafe.TimeoutExceededException e) {` |
| **:89** `kill(false);` |
| **:90** `return this.exceptionHandler(new TimeoutExceededException(workerTaskTimeout));` |
| **:91** `} catch (RunnableTaskException e) {` |
| **:92** `taskOutput = e.getOutput();` |
| **:93** `return this.exceptionHandler(e);` |

---

## File 4: `WorkerTask.java`

`core/src/main/java/io/kestra/core/runners/WorkerTask.java`

The message sent from executor to worker. Data envelope.

| |
|---|
| **:17** `public class WorkerTask extends WorkerJob {` |
| **:18** `public static final String TYPE = "task";` |
| **:23** `private final String type = TYPE;` |
| **:26** `private TaskRun taskRun;` |
| **:29** `private Task task;` |
| **:32** `private RunContext runContext;` |
| **:35** `private ExecutionKind  executionKind;` |
| **:41** `public String uid() {` |
| **:42** `return this.taskRun.getId();` |
| **:50** `public TaskRun fail() {` |
| **:51** `var state = State.Type.fail(task);` |
| **:52** `return this.getTaskRun().withState(state);` |

---

## File 5: `WorkerTaskResult.java`

`core/src/main/java/io/kestra/core/runners/WorkerTaskResult.java`

The message sent from worker back to executor.

| |
|---|
| **:17** `public class WorkerTaskResult implements HasUID {` |
| **:19** `TaskRun taskRun;` |
| **:21** `List<TaskRun> dynamicTaskRuns;` |
| **:23** `public WorkerTaskResult(TaskRun taskRun) {` |
| **:24** `this(taskRun, new ArrayList<>(1));` |
| **:30** `public String uid() {` |
| **:31** `return taskRun.getId();` |

---

## The Complete Loop

| |
|---|
| **Step 1** — `JdbcExecutor.java:641` — `executor = executorService.process(executor);` |
| **Step 2** — `JdbcExecutor.java:671` — `workerJobQueue.emit(workerGroupKey, workerTask.withTaskRun(taskRun));` |
| **Step 3** — `DefaultWorker.java:290` — `handleTask(task);` |
| **Step 4** — `DefaultWorker.java:371` — `this.run(workerTask, true);` |
| **Step 5** — `DefaultWorker.java:720` — `workerTask = this.runAttempt(runContext, workerTask);` |
| **Step 6** — `DefaultWorker.java:925` — `WorkerTaskCallable workerTaskCallable = new WorkerTaskCallable(workerTask, task, runContext, metricRegistry);` |
| **Step 7** — `DefaultWorker.java:926` — `io.kestra.core.models.flows.State.Type state = callJob(workerTaskCallable);` |
| **Step 8** — `WorkerTaskCallable.java:81` — `taskOutput = task.run(runContext);` |
| **Step 9** — `DefaultWorker.java:952` — `Variables variables = variablesService.of(StorageContext.forTask(taskRun), workerTaskCallable.getTaskOutput());` |
| **Step 10** — `DefaultWorker.java:953` — `taskRun = taskRun.withOutputs(variables);` |
| **Step 11** — `DefaultWorker.java:761` — `WorkerTaskResult workerTaskResult = new WorkerTaskResult(workerTask.getTaskRun(), dynamicTaskRuns);` |
| **Step 12** — `DefaultWorker.java:763` — `this.workerTaskResultQueue.emit(workerTaskResult);` |
| **Step 13** — `JdbcExecutor.java:806` — `Executor executor = executionRepository.lock(message.getTaskRun().getExecutionId(), pair -> {` |
| **Step 14** — `JdbcExecutor.java:817` — `executorService.addWorkerTaskResult(current, throwSupplier(() -> findFlowOrThrow(execution)), message);` |
| **Step 15** — `JdbcExecutor.java:848` — `this.toExecution(executor);` |
| **→ back to Step 1** |
