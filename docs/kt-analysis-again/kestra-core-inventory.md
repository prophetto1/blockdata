# Kestra Core Engine + Internal Plugins — Complete File Inventory

**Source:** `E:/kestra/core/src/main/java/`
**Total files:** 890 (761 engine + 129 internal plugins)
**Generated:** 2026-03-16

---

## Engine: io.kestra.core (761 files)


### core/annotations/
| File | Class Declaration |
|------|-------------------|
| Retryable.java | `public @interface Retryable {` |

### core/app/
| File | Class Declaration |
|------|-------------------|
| AppBlockInterface.java | `* Top-level marker interface for Kestra's plugin of type App.` |
| AppPluginInterface.java | `* Top-level marker interface for Kestra's plugin of type App.` |

### core/assets/
| File | Class Declaration |
|------|-------------------|
| AssetManagerFactory.java | `public class AssetManagerFactory {` |
| AssetService.java | `public interface AssetService {` |

### core/cache/
| File | Class Declaration |
|------|-------------------|
| NoopCache.java | `public class NoopCache<K, V> implements Cache<K, V> {` |

### core/contexts/
| File | Class Declaration |
|------|-------------------|
| KestraBeansFactory.java | `public class KestraBeansFactory {` |
| KestraConfig.java | `public class KestraConfig {` |
| KestraContext.java | `* Utility class for retrieving common information about a Kestra Server at runtime.` |
| MavenPluginRepositoryConfig.java | `public record MavenPluginRepositoryConfig(` |

### core/converters/
| File | Class Declaration |
|------|-------------------|
| PluginDefaultConverter.java | `public class PluginDefaultConverter implements TypeConverter<Map, PluginDefault> {` |

### core/debug/
| File | Class Declaration |
|------|-------------------|
| Breakpoint.java | `public class Breakpoint {` |

### core/docs/
| File | Class Declaration |
|------|-------------------|
| AbstractClassDocumentation.java | `public abstract class AbstractClassDocumentation<T> {` |
| ClassInputDocumentation.java | `public class ClassInputDocumentation extends AbstractClassDocumentation<Input> {` |
| ClassPluginDocumentation.java | `public class ClassPluginDocumentation<T> extends AbstractClassDocumentation<T> {` |
| Document.java | `public class Document {` |
| DocumentationGenerator.java | `public class DocumentationGenerator {` |
| DocumentationWithSchema.java | `public class DocumentationWithSchema {` |
| InputType.java | `public class InputType {` |
| JsonSchemaCache.java | `public class JsonSchemaCache {` |
| JsonSchemaGenerator.java | `public class JsonSchemaGenerator {` |
| Plugin.java | `public class Plugin {` |
| PluginIcon.java | `public class PluginIcon {` |
| Schema.java | `public class Schema {` |
| SchemaType.java | `public enum SchemaType {` |

### core/encryption/
| File | Class Declaration |
|------|-------------------|
| EncryptionService.java | `public class EncryptionService {` |

### core/endpoints/
| File | Class Declaration |
|------|-------------------|
| BasicAuthEndpointsFilter.java | `public class BasicAuthEndpointsFilter implements HttpServerFilter {` |
| EndpointBasicAuthConfiguration.java | `public class EndpointBasicAuthConfiguration {` |

### core/events/
| File | Class Declaration |
|------|-------------------|
| CrudEvent.java | `public class CrudEvent<T> {` |
| CrudEventType.java | `public enum CrudEventType {` |

### core/exceptions/
| File | Class Declaration |
|------|-------------------|
| AiException.java | `public class AiException extends KestraRuntimeException {` |
| ConflictException.java | `public class ConflictException extends KestraRuntimeException {` |
| DeserializationException.java | `public class DeserializationException extends RuntimeException {` |
| FlowNotFoundException.java | `public class FlowNotFoundException extends NotFoundException {` |
| FlowProcessingException.java | `* Exception class for all problems encountered when processing (parsing, injecting defaults, validating) a flow.` |
| IllegalConditionEvaluation.java | `public class IllegalConditionEvaluation extends InternalException {` |
| IllegalVariableEvaluationException.java | `public class IllegalVariableEvaluationException extends InternalException {` |
| InputOutputValidationException.java | `public class InputOutputValidationException extends KestraRuntimeException {` |
| InternalException.java | `public class InternalException extends Exception {` |
| InvalidException.java | `public class InvalidException extends KestraRuntimeException {` |
| InvalidQueryFiltersException.java | `public class InvalidQueryFiltersException extends KestraRuntimeException {` |
| InvalidTriggerConfigurationException.java | `public class InvalidTriggerConfigurationException extends KestraRuntimeException {` |
| KestraException.java | `public class KestraException extends Exception {` |
| KestraRuntimeException.java | `public class KestraRuntimeException extends RuntimeException {` |
| KilledException.java | `public class KilledException extends KestraRuntimeException {` |
| MigrationRequiredException.java | `public class MigrationRequiredException extends RuntimeException {` |
| NotFoundException.java | `public class NotFoundException extends KestraRuntimeException {` |
| ResourceAccessDeniedException.java | `public class ResourceAccessDeniedException extends KestraRuntimeException {` |
| ResourceExpiredException.java | `public class ResourceExpiredException extends Exception {` |
| TaskNotFoundException.java | `public class TaskNotFoundException extends NotFoundException {` |
| TimeoutExceededException.java | `public class TimeoutExceededException extends Exception {` |
| ValidationErrorException.java | `public class ValidationErrorException extends KestraRuntimeException {` |

### core/http/
| File | Class Declaration |
|------|-------------------|
| HttpRequest.java | `public class HttpRequest {` |
| HttpResponse.java | `public class HttpResponse<T> {` |
| HttpService.java | `public abstract class HttpService {` |
| HttpSseEvent.java | `public record HttpSseEvent<T> (` |

### core/http/client/
| File | Class Declaration |
|------|-------------------|
| HttpClient.java | `public class HttpClient implements Closeable {` |
| HttpClientException.java | `public abstract class HttpClientException extends HttpException {` |
| HttpClientRequestException.java | `public class HttpClientRequestException extends HttpClientException {` |
| HttpClientResponseException.java | `public class HttpClientResponseException extends HttpClientException {` |

### core/http/client/apache/
| File | Class Declaration |
|------|-------------------|
| AbstractLoggingInterceptor.java | `public abstract class AbstractLoggingInterceptor {` |
| FailedResponseInterceptor.java | `public class FailedResponseInterceptor implements HttpResponseInterceptor {` |
| HttpResponseFailure.java | `public final class HttpResponseFailure {` |
| LoggingRequestInterceptor.java | `public class LoggingRequestInterceptor extends AbstractLoggingInterceptor implements HttpRequestInterceptor {` |
| LoggingResponseInterceptor.java | `public class LoggingResponseInterceptor extends AbstractLoggingInterceptor implements HttpResponseInterceptor {` |
| RunContextResponseInterceptor.java | `public class RunContextResponseInterceptor implements HttpResponseInterceptor {` |

### core/http/client/configurations/
| File | Class Declaration |
|------|-------------------|
| AbstractAuthConfiguration.java | `public abstract class AbstractAuthConfiguration {` |
| BasicAuthConfiguration.java | `public class BasicAuthConfiguration extends AbstractAuthConfiguration {` |
| BearerAuthConfiguration.java | `public class BearerAuthConfiguration extends AbstractAuthConfiguration {` |
| DigestAuthConfiguration.java | `public class DigestAuthConfiguration extends AbstractAuthConfiguration {` |
| HttpConfiguration.java | `public class HttpConfiguration {` |
| ProxyConfiguration.java | `public class ProxyConfiguration {` |
| SslOptions.java | `public class SslOptions {` |
| TimeoutConfiguration.java | `public class TimeoutConfiguration {` |

### core/killswitch/
| File | Class Declaration |
|------|-------------------|
| EvaluationType.java | `public enum EvaluationType {` |
| KillSwitchService.java | `public class KillSwitchService {` |

### core/listeners/
| File | Class Declaration |
|------|-------------------|
| RetryEvents.java | `public class RetryEvents {` |

### core/log/
| File | Class Declaration |
|------|-------------------|
| KestraLogFilter.java | `public class KestraLogFilter extends EventEvaluatorBase<ILoggingEvent> {` |

### core/metrics/
| File | Class Declaration |
|------|-------------------|
| GlobalTagsConfigurer.java | `public class GlobalTagsConfigurer implements MeterRegistryConfigurer<SimpleMeterRegistry> {` |
| MeterRegistryBinderFactory.java | `public class MeterRegistryBinderFactory {` |
| MetricConfig.java | `public class MetricConfig {` |
| MetricRegistry.java | `public class MetricRegistry {` |

### core/models/
| File | Class Declaration |
|------|-------------------|
| FetchVersion.java | `public enum FetchVersion {` |
| HasSource.java | `public interface HasSource {` |
| HasUID.java | `public interface HasUID {` |
| Label.java | `public record Label(` |
| Pauseable.java | `public interface Pauseable {` |
| PluginVersioning.java | `public interface PluginVersioning {` |
| QueryFilter.java | `public record QueryFilter(` |
| SearchResult.java | `public class SearchResult<T> {` |
| ServerType.java | `public enum  ServerType {` |
| Setting.java | `public class Setting implements HasUID {` |
| SoftDeletable.java | `* This interface marks entities that implement a soft deletion mechanism.` |
| TenantAndNamespace.java | `public record TenantAndNamespace(String tenantId, String namespace) {}` |
| TenantInterface.java | `public interface TenantInterface {` |
| WorkerJobLifecycle.java | `public interface WorkerJobLifecycle {` |

### core/models/assets/
| File | Class Declaration |
|------|-------------------|
| Asset.java | `public abstract class Asset implements HasUID, SoftDeletable<Asset>, Plugin {` |
| AssetExporter.java | `public abstract class AssetExporter<T extends Output>  implements io.kestra.core.models.Plugin {` |
| AssetIdentifier.java | `public record AssetIdentifier(@Hidden String tenantId, @Hidden String namespace, String id, String type){` |
| AssetLineage.java | `public record AssetLineage(` |
| AssetUser.java | `public record AssetUser(String tenantId, String namespace, String flowId, Integer flowRevision, String executionId, String taskId, String taskRunId,` |
| AssetsDeclaration.java | `public class AssetsDeclaration {` |
| AssetsInOut.java | `public class AssetsInOut {` |
| Custom.java | `public class Custom extends Asset {` |
| External.java | `public class External extends Asset {` |

### core/models/collectors/
| File | Class Declaration |
|------|-------------------|
| ConfigurationUsage.java | `public class ConfigurationUsage {` |
| ExecutionUsage.java | `public class ExecutionUsage {` |
| FlowUsage.java | `public class FlowUsage {` |
| HostUsage.java | `public class HostUsage {` |
| PluginMetric.java | `public record PluginMetric(String type, double count, double totalTime, double meanTime){` |
| PluginUsage.java | `public class PluginUsage {` |
| Result.java | `public class Result {` |
| ServiceUsage.java | `public record ServiceUsage(` |

### core/models/conditions/
| File | Class Declaration |
|------|-------------------|
| Condition.java | `public abstract class Condition implements Plugin, Rethrow.PredicateChecked<ConditionContext, InternalException> {` |
| ConditionContext.java | `public class ConditionContext {` |
| ScheduleCondition.java | `public interface ScheduleCondition {` |

### core/models/dashboards/
| File | Class Declaration |
|------|-------------------|
| AggregationType.java | `public enum AggregationType {` |
| ChartOption.java | `public class ChartOption {` |
| ColumnDescriptor.java | `public class ColumnDescriptor<F extends Enum<F>> {` |
| Dashboard.java | `public class Dashboard implements HasUID, SoftDeletable<Dashboard> {` |
| DataFilter.java | `public abstract class DataFilter<F extends Enum<F>, C extends ColumnDescriptor<F>> implements io.kestra.core.models.Plugin, IData<F> {` |
| DataFilterKPI.java | `public abstract class DataFilterKPI<F extends Enum<F>, C extends ColumnDescriptor<F>> implements io.kestra.core.models.Plugin, IData<F> {` |
| GraphStyle.java | `public enum GraphStyle {` |
| Order.java | `public enum Order {` |
| OrderBy.java | `public class OrderBy {` |
| TimeWindow.java | `public class TimeWindow {` |
| WithLegend.java | `public interface WithLegend {` |
| WithTooltip.java | `public interface WithTooltip {` |

### core/models/dashboards/charts/
| File | Class Declaration |
|------|-------------------|
| Chart.java | `public abstract class Chart<P extends ChartOption> implements io.kestra.core.models.Plugin {` |
| DataChart.java | `public abstract class DataChart<P extends ChartOption, D extends DataFilter<?, ?>> extends Chart<P> implements io.kestra.core.models.Plugin {` |
| DataChartKPI.java | `public abstract class DataChartKPI<P extends KpiOption, D extends DataFilterKPI<?, ?>> extends Chart<P> implements io.kestra.core.models.Plugin {` |
| LegendOption.java | `public class LegendOption {` |
| TooltipBehaviour.java | `public enum TooltipBehaviour {` |

### core/models/dashboards/filters/
| File | Class Declaration |
|------|-------------------|
| AbstractFilter.java | `public abstract class AbstractFilter<F extends Enum<F>> {` |
| Contains.java | `public class Contains<F extends Enum<F>> extends AbstractFilter<F> {` |
| EndsWith.java | `public class EndsWith <F extends Enum<F>> extends AbstractFilter<F> {` |
| EqualTo.java | `public class EqualTo <F extends Enum<F>> extends AbstractFilter<F> {` |
| GreaterThan.java | `public class GreaterThan <F extends Enum<F>> extends AbstractFilter<F> {` |
| GreaterThanOrEqualTo.java | `public class GreaterThanOrEqualTo <F extends Enum<F>> extends AbstractFilter<F> {` |
| In.java | `public class In <F extends Enum<F>> extends AbstractFilter<F> {` |
| IsFalse.java | `public class IsFalse <F extends Enum<F>> extends AbstractFilter<F> {` |
| IsNotNull.java | `public class IsNotNull <F extends Enum<F>> extends AbstractFilter<F> {` |
| IsNull.java | `public class IsNull <F extends Enum<F>> extends AbstractFilter<F> {` |
| IsTrue.java | `public class IsTrue <F extends Enum<F>> extends AbstractFilter<F> {` |
| LessThan.java | `public class LessThan <F extends Enum<F>> extends AbstractFilter<F> {` |
| LessThanOrEqualTo.java | `public class LessThanOrEqualTo <F extends Enum<F>> extends AbstractFilter<F> {` |
| NotEqualTo.java | `public class NotEqualTo <F extends Enum<F>> extends AbstractFilter<F> {` |
| NotIn.java | `public class NotIn <F extends Enum<F>> extends AbstractFilter<F> {` |
| Or.java | `public class Or <F extends Enum<F>> extends AbstractFilter<F> {` |
| Regex.java | `public class Regex <F extends Enum<F>> extends AbstractFilter<F> {` |
| StartsWith.java | `public class StartsWith <F extends Enum<F>> extends AbstractFilter<F> {` |

### core/models/executions/
| File | Class Declaration |
|------|-------------------|
| AbstractMetricEntry.java | `abstract public class AbstractMetricEntry<T> {` |
| Execution.java | `public class Execution implements SoftDeletable<Execution>, TenantInterface, HasUID {` |
| ExecutionKilled.java | `abstract public class ExecutionKilled implements TenantInterface, HasUID {` |
| ExecutionKilledExecution.java | `public class ExecutionKilledExecution extends ExecutionKilled implements TenantInterface {` |
| ExecutionKilledTrigger.java | `public class ExecutionKilledTrigger extends ExecutionKilled implements TenantInterface {` |
| ExecutionKind.java | `public enum ExecutionKind {` |
| ExecutionMetadata.java | `public class ExecutionMetadata {` |
| ExecutionTrigger.java | `public class ExecutionTrigger {` |
| LogEntry.java | `public class LogEntry implements TenantInterface {` |
| MetricEntry.java | `public class MetricEntry implements TenantInterface {` |
| NextTaskRun.java | `public class NextTaskRun {` |
| TaskRun.java | `public class TaskRun implements TenantInterface {` |
| TaskRunAttempt.java | `public class TaskRunAttempt {` |
| Variables.java | `public sealed interface Variables extends Map<String, Object> {` |

### core/models/executions/metrics/
| File | Class Declaration |
|------|-------------------|
| Counter.java | `public final class Counter extends AbstractMetricEntry<Double> {` |
| Gauge.java | `public class Gauge extends AbstractMetricEntry<Double> {` |
| MetricAggregation.java | `public class MetricAggregation {` |
| MetricAggregations.java | `public class MetricAggregations {` |
| Timer.java | `public class Timer extends AbstractMetricEntry<Duration> {` |

### core/models/executions/statistics/
| File | Class Declaration |
|------|-------------------|
| DailyExecutionStatistics.java | `public class DailyExecutionStatistics {` |
| ExecutionCount.java | `public class ExecutionCount {` |
| ExecutionCountStatistics.java | `public record ExecutionCountStatistics(` |
| ExecutionStatistics.java | `public class ExecutionStatistics {` |
| Flow.java | `public class Flow {` |
| LogStatistics.java | `public class LogStatistics {` |

### core/models/flows/
| File | Class Declaration |
|------|-------------------|
| AbstractFlow.java | `public abstract class AbstractFlow implements FlowInterface {` |
| Concurrency.java | `public class Concurrency {` |
| Data.java | `public interface Data {` |
| DependsOn.java | `public record DependsOn(` |
| Flow.java | `* This class is planned for deprecation - use the {@link FlowWithSource}.` |
| FlowForExecution.java | `public class FlowForExecution extends AbstractFlow {` |
| FlowId.java | `public interface FlowId {` |
| FlowInterface.java | `* The base interface for FLow.` |
| FlowScope.java | `public enum FlowScope {` |
| FlowSource.java | `public record FlowSource(` |
| FlowWithException.java | `public class FlowWithException extends FlowWithSource {` |
| FlowWithPath.java | `public class FlowWithPath {` |
| FlowWithSource.java | `public class FlowWithSource extends Flow {` |
| GenericFlow.java | `public class GenericFlow extends AbstractFlow implements HasUID {` |
| Input.java | `public abstract class Input<T> implements Data {` |
| Output.java | `public class Output implements Data {` |
| PluginDefault.java | `public class PluginDefault {` |
| RenderableInput.java | `public interface RenderableInput {` |
| State.java | `public class State {` |
| Type.java | `public enum Type {` |

### core/models/flows/check/
| File | Class Declaration |
|------|-------------------|
| Check.java | `public class Check {` |

### core/models/flows/input/
| File | Class Declaration |
|------|-------------------|
| ArrayInput.java | `public class ArrayInput extends Input<List<?>> implements ItemTypeInterface {` |
| BoolInput.java | `public class BoolInput extends Input<Boolean> {` |
| BooleanInput.java | `public class BooleanInput extends Input<Boolean> {` |
| DateInput.java | `public class DateInput extends Input<LocalDate> {` |
| DateTimeInput.java | `public class DateTimeInput extends Input<Instant> {` |
| DurationInput.java | `public class DurationInput extends Input<Duration> {` |
| EmailInput.java | `public class EmailInput extends Input<String> {` |
| EnumInput.java | `public class EnumInput extends Input<String> {` |
| FileInput.java | `public class FileInput extends Input<URI> {` |
| FloatInput.java | `public class FloatInput extends Input<Float> {` |
| InputAndValue.java | `public record InputAndValue(` |
| IntInput.java | `public class IntInput extends Input<Integer> {` |
| ItemTypeInterface.java | `public interface ItemTypeInterface {` |
| JsonInput.java | `public class JsonInput extends Input<Object> {` |
| MultiselectInput.java | `public class MultiselectInput extends Input<List<String>> implements ItemTypeInterface, RenderableInput {` |
| SecretInput.java | `public class SecretInput extends Input<EncryptedString> {` |
| SelectInput.java | `public class SelectInput extends Input<String> implements RenderableInput {` |
| StringInput.java | `public class StringInput extends Input<String> {` |
| TimeInput.java | `public class TimeInput extends Input<LocalTime> {` |
| URIInput.java | `public class URIInput extends Input<String> {` |
| YamlInput.java | `public class YamlInput  extends Input<Object> {` |

### core/models/flows/sla/
| File | Class Declaration |
|------|-------------------|
| ExecutionChangedSLA.java | `* Marker interface to denote an SLA as evaluating on execution change.` |
| ExecutionMonitoringSLA.java | `* Marker interface to denote an SLA as evaluating using an {@link SLAMonitor}.` |
| SLA.java | `public abstract class SLA {` |
| SLAMonitor.java | `public class SLAMonitor implements HasUID {` |
| SLAMonitorStorage.java | `public interface SLAMonitorStorage {` |
| Violation.java | `public record Violation(String slaId, SLA.Behavior behavior, List<Label> labels, String reason) {` |

### core/models/flows/sla/types/
| File | Class Declaration |
|------|-------------------|
| ExecutionAssertionSLA.java | `public class ExecutionAssertionSLA extends SLA implements ExecutionChangedSLA {` |
| MaxDurationSLA.java | `public class MaxDurationSLA extends SLA implements ExecutionMonitoringSLA {` |

### core/models/hierarchies/
| File | Class Declaration |
|------|-------------------|
| AbstractGraph.java | `public abstract class AbstractGraph {` |
| AbstractGraphTask.java | `public abstract class AbstractGraphTask extends AbstractGraph {` |
| AbstractGraphTrigger.java | `public abstract class AbstractGraphTrigger extends AbstractGraph {` |
| FlowGraph.java | `public class FlowGraph {` |
| Graph.java | `public class Graph<T, V> {` |
| GraphCluster.java | `public class GraphCluster extends AbstractGraph {` |
| GraphClusterAfterExecution.java | `public class GraphClusterAfterExecution extends AbstractGraph {` |
| GraphClusterEnd.java | `public class GraphClusterEnd extends AbstractGraph {` |
| GraphClusterFinally.java | `public class GraphClusterFinally extends AbstractGraph {` |
| GraphClusterRoot.java | `public class GraphClusterRoot extends AbstractGraph {` |
| GraphTask.java | `public class GraphTask extends AbstractGraphTask {` |
| GraphTrigger.java | `public class GraphTrigger extends AbstractGraphTrigger {` |
| Relation.java | `public class Relation {` |
| RelationType.java | `public enum RelationType {` |
| SubflowGraphCluster.java | `public class SubflowGraphCluster extends GraphCluster {` |
| SubflowGraphTask.java | `public class SubflowGraphTask extends AbstractGraphTask {` |

### core/models/kv/
| File | Class Declaration |
|------|-------------------|
| KVType.java | `public enum KVType {` |
| PersistedKvMetadata.java | `public class PersistedKvMetadata implements SoftDeletable<PersistedKvMetadata>, TenantInterface, HasUID {` |

### core/models/listeners/
| File | Class Declaration |
|------|-------------------|
| Listener.java | `public class Listener {` |

### core/models/namespaces/
| File | Class Declaration |
|------|-------------------|
| Namespace.java | `public class Namespace implements NamespaceInterface {` |
| NamespaceInterface.java | `public interface NamespaceInterface extends HasUID {` |

### core/models/namespaces/files/
| File | Class Declaration |
|------|-------------------|
| NamespaceFileMetadata.java | `public class NamespaceFileMetadata implements SoftDeletable<NamespaceFileMetadata>, TenantInterface, HasUID {` |

### core/models/property/
| File | Class Declaration |
|------|-------------------|
| Data.java | `public class Data {` |
| Property.java | `public class Property<T> {` |
| PropertyContext.java | `public interface PropertyContext {` |
| PropertyValueExtractor.java | `public class PropertyValueExtractor implements ValueExtractor<Property<@ExtractedValue ?>> {` |
| URIFetcher.java | `* Helper class for fetching content from a URI.` |

### core/models/settings/
| File | Class Declaration |
|------|-------------------|
| DashboardSettings.java | `public class DashboardSettings {` |
| PreferencesSettings.java | `public class PreferencesSettings {` |

### core/models/stats/
| File | Class Declaration |
|------|-------------------|
| SummaryStatistics.java | `public record SummaryStatistics(` |

### core/models/storage/
| File | Class Declaration |
|------|-------------------|
| FileMetas.java | `public class FileMetas {` |

### core/models/tasks/
| File | Class Declaration |
|------|-------------------|
| Cache.java | `public class Cache {` |
| ExecutableTask.java | `public interface ExecutableTask<T extends Output>{` |
| ExecutionUpdatableTask.java | `public interface ExecutionUpdatableTask {` |
| FileExistComportment.java | `public enum FileExistComportment {` |
| FlowableTask.java | `public interface FlowableTask <T extends Output> {` |
| GenericTask.java | `public class GenericTask implements TaskInterface {` |
| InputFilesInterface.java | `public interface InputFilesInterface {` |
| NamespaceFiles.java | `public class NamespaceFiles {` |
| NamespaceFilesInterface.java | `public interface NamespaceFilesInterface {` |
| Output.java | `public interface Output {` |
| OutputFilesInterface.java | `public interface OutputFilesInterface {` |
| ResolvedTask.java | `public class ResolvedTask {` |
| RunnableTask.java | `public interface RunnableTask <T extends Output> extends Plugin, WorkerJobLifecycle {` |
| RunnableTaskException.java | `public class RunnableTaskException extends Exception {` |
| Task.java | `abstract public class Task implements TaskInterface {` |
| TaskForExecution.java | `public class TaskForExecution implements TaskInterface {` |
| TaskInterface.java | `public interface TaskInterface extends Plugin, PluginVersioning {` |
| TaskResult.java | `public record TaskResult(` |
| VoidOutput.java | `public class VoidOutput implements Output {` |
| WorkerGroup.java | `public class WorkerGroup {` |

### core/models/tasks/common/
| File | Class Declaration |
|------|-------------------|
| EncryptedString.java | `public class EncryptedString {` |
| FetchOutput.java | `public class FetchOutput implements Output {` |
| FetchType.java | `public enum FetchType {` |

### core/models/tasks/logs/
| File | Class Declaration |
|------|-------------------|
| LogExporter.java | `public abstract class LogExporter<T extends Output>  implements io.kestra.core.models.Plugin {` |
| LogRecord.java | `public class LogRecord {` |
| LogRecordMapper.java | `public final class LogRecordMapper {` |

### core/models/tasks/metrics/
| File | Class Declaration |
|------|-------------------|
| AbstractMetric.java | `public abstract class AbstractMetric {` |
| CounterMetric.java | `public class CounterMetric extends AbstractMetric {` |
| GaugeMetric.java | `public class GaugeMetric extends AbstractMetric {` |
| TimerMetric.java | `public class TimerMetric extends AbstractMetric {` |

### core/models/tasks/retrys/
| File | Class Declaration |
|------|-------------------|
| AbstractRetry.java | `public abstract class AbstractRetry {` |
| Constant.java | `public class Constant extends AbstractRetry {` |
| Exponential.java | `public class Exponential extends AbstractRetry {` |
| Random.java | `public class Random extends AbstractRetry {` |

### core/models/tasks/runners/
| File | Class Declaration |
|------|-------------------|
| AbstractLogConsumer.java | `* Base class for script engine log consumer.` |
| DefaultLogConsumer.java | `public class DefaultLogConsumer extends AbstractLogConsumer {` |
| PluginUtilsService.java | `abstract public class PluginUtilsService {` |
| RemoteRunnerInterface.java | `public interface RemoteRunnerInterface {` |
| ScriptService.java | `* Helper class for task runners and script tasks.` |
| TargetOS.java | `public enum TargetOS {` |
| TaskCommands.java | `public interface TaskCommands {` |
| TaskException.java | `public class TaskException extends Exception {` |
| TaskLogLineMatcher.java | `public class TaskLogLineMatcher {` |
| TaskRunner.java | `* Base class for all task runners.` |
| TaskRunnerDetailResult.java | `public class TaskRunnerDetailResult implements Output {` |
| TaskRunnerResult.java | `public class TaskRunnerResult<T extends TaskRunnerDetailResult> implements Output {` |

### core/models/templates/
| File | Class Declaration |
|------|-------------------|
| Template.java | `public class Template implements SoftDeletable<Template>, TenantInterface, HasUID {` |
| TemplateEnabled.java | `public @interface TemplateEnabled {` |
| TemplateSource.java | `public class TemplateSource extends Template {` |

### core/models/topologies/
| File | Class Declaration |
|------|-------------------|
| FlowNode.java | `public class FlowNode implements TenantInterface {` |
| FlowRelation.java | `public enum FlowRelation {` |
| FlowTopology.java | `public class FlowTopology implements HasUID {` |
| FlowTopologyGraph.java | `public class FlowTopologyGraph {` |

### core/models/triggers/
| File | Class Declaration |
|------|-------------------|
| AbstractTrigger.java | `abstract public class AbstractTrigger implements TriggerInterface {` |
| AbstractTriggerForExecution.java | `public class AbstractTriggerForExecution implements TriggerInterface {` |
| Backfill.java | `public class Backfill {` |
| GenericTrigger.java | `public class GenericTrigger implements TriggerInterface{` |
| PollingTriggerInterface.java | `public interface PollingTriggerInterface extends WorkerTriggerInterface {` |
| RealtimeTriggerInterface.java | `public interface RealtimeTriggerInterface extends WorkerTriggerInterface {` |
| RecoverMissedSchedules.java | `public enum RecoverMissedSchedules {` |
| Schedulable.java | `public interface Schedulable extends PollingTriggerInterface{` |
| StatefulTriggerInterface.java | `public interface StatefulTriggerInterface {` |
| StatefulTriggerService.java | `public class StatefulTriggerService {` |
| TimeWindow.java | `public class TimeWindow {` |
| Trigger.java | `public class Trigger extends TriggerContext implements HasUID {` |
| TriggerContext.java | `public class TriggerContext {` |
| TriggerInterface.java | `public interface TriggerInterface extends Plugin, PluginVersioning {` |
| TriggerOutput.java | `public interface TriggerOutput<T extends Output> {` |
| TriggerService.java | `public abstract class TriggerService {` |
| WorkerTriggerInterface.java | `public interface WorkerTriggerInterface extends WorkerJobLifecycle {` |

### core/models/triggers/multipleflows/
| File | Class Declaration |
|------|-------------------|
| MultipleCondition.java | `public interface MultipleCondition extends Rethrow.PredicateChecked<ConditionContext, InternalException> {` |
| MultipleConditionStorageInterface.java | `public interface MultipleConditionStorageInterface {` |
| MultipleConditionWindow.java | `public class MultipleConditionWindow implements HasUID {` |

### core/models/validations/
| File | Class Declaration |
|------|-------------------|
| KestraConstraintViolationException.java | `public class KestraConstraintViolationException extends ConstraintViolationException {` |
| ManualConstraintViolation.java | `public class ManualConstraintViolation<T> implements ConstraintViolation<T> {` |
| ManualPath.java | `public class ManualPath implements Path {` |
| ManualPropertyNode.java | `public class ManualPropertyNode implements Path.PropertyNode {` |
| ModelValidator.java | `public class ModelValidator {` |
| ValidateConstraintViolation.java | `public class ValidateConstraintViolation {` |

### core/plugins/
| File | Class Declaration |
|------|-------------------|
| AdditionalPlugin.java | `public abstract class AdditionalPlugin implements Plugin {` |
| DefaultPluginRegistry.java | `public class DefaultPluginRegistry implements PluginRegistry {` |
| ExternalPlugin.java | `public class ExternalPlugin {` |
| LocalPluginManager.java | `public class LocalPluginManager implements PluginManager {` |
| MavenPluginDownloader.java | `public class MavenPluginDownloader implements Closeable {` |
| PluginArtifact.java | `public record PluginArtifact(` |
| PluginArtifactMetadata.java | `public record PluginArtifactMetadata(` |
| PluginCatalogService.java | `public class PluginCatalogService {` |
| PluginClassAndMetadata.java | `public record PluginClassAndMetadata<T>(` |
| PluginClassLoader.java | `* attempts to find the class in its own context before delegating to the parent ClassLoader.` |
| PluginConfiguration.java | `public record PluginConfiguration(@Parameter Integer order,` |
| PluginConfigurations.java | `public final class PluginConfigurations {` |
| PluginIdentifier.java | `public interface PluginIdentifier {` |
| PluginManager.java | `* Service interface for managing Kestra's plugins.` |
| PluginModule.java | `public class PluginModule extends SimpleModule {` |
| PluginRegistry.java | `public interface PluginRegistry {` |
| PluginResolutionResult.java | `public record PluginResolutionResult(` |
| PluginResolver.java | `public class PluginResolver {` |
| PluginScanner.java | `public class PluginScanner {` |
| RegisteredPlugin.java | `public class RegisteredPlugin {` |

### core/plugins/notifications/
| File | Class Declaration |
|------|-------------------|
| ExecutionInterface.java | `public interface ExecutionInterface {` |
| ExecutionService.java | `public final class ExecutionService {` |

### core/plugins/serdes/
| File | Class Declaration |
|------|-------------------|
| AssetDeserializer.java | `public final class AssetDeserializer extends PluginDeserializer<Asset> {` |
| PluginDeserializer.java | `* The {@link PluginDeserializer} uses the {@link PluginRegistry} to found the plugin class corresponding to` |

### core/queues/
| File | Class Declaration |
|------|-------------------|
| MessageTooBigException.java | `public class MessageTooBigException extends QueueException {` |
| QueueException.java | `public class QueueException extends Exception {` |
| QueueFactoryInterface.java | `public interface QueueFactoryInterface {` |
| QueueInterface.java | `public interface QueueInterface<T> extends Closeable, Pauseable {` |
| QueueService.java | `public class QueueService {` |
| UnsupportedMessageException.java | `public class UnsupportedMessageException extends QueueException {` |
| WorkerJobQueueInterface.java | `public interface WorkerJobQueueInterface extends QueueInterface<WorkerJob> {` |

### core/reporter/
| File | Class Declaration |
|------|-------------------|
| AbstractReportable.java | `public abstract class AbstractReportable<T extends Reportable.Event> implements Reportable<T> {` |
| Reportable.java | `public interface Reportable<T extends Reportable.Event> {` |
| ReportableRegistry.java | `public class ReportableRegistry {` |
| ReportableScheduler.java | `public class ReportableScheduler {` |
| Schedules.java | `* Utility class providing common implementations of {@link Reportable.ReportingSchedule}.` |
| ServerEvent.java | `public record ServerEvent(` |
| ServerEventSender.java | `public class ServerEventSender {` |
| Type.java | `public interface Type {` |
| Types.java | `public enum Types implements Type {` |

### core/reporter/model/
| File | Class Declaration |
|------|-------------------|
| Count.java | `public record Count(` |

### core/reporter/reports/
| File | Class Declaration |
|------|-------------------|
| FeatureUsageReport.java | `public class FeatureUsageReport extends AbstractReportable<FeatureUsageReport.UsageEvent> {` |
| PluginMetricReport.java | `public class PluginMetricReport extends AbstractReportable<PluginMetricReport.PluginMetricEvent> {` |
| PluginUsageReport.java | `public class PluginUsageReport extends AbstractReportable<PluginUsageReport.PluginUsageEvent> {` |
| ServiceUsageReport.java | `public class ServiceUsageReport extends AbstractReportable<ServiceUsageReport.ServiceUsageEvent> {` |
| SystemInformationReport.java | `public class SystemInformationReport extends AbstractReportable<SystemInformationReport.SystemInformationEvent> {` |

### core/repositories/
| File | Class Declaration |
|------|-------------------|
| ArrayListTotal.java | `public class ArrayListTotal<T> extends ArrayList<T> {` |
| DashboardRepositoryInterface.java | `public interface DashboardRepositoryInterface {` |
| ExecutionRepositoryInterface.java | `public interface ExecutionRepositoryInterface extends SaveRepositoryInterface<Execution>, QueryBuilderInterface<Executions.Fields> {` |
| FlowRepositoryInterface.java | `public interface FlowRepositoryInterface extends QueryBuilderInterface<Flows.Fields> {` |
| FlowTopologyRepositoryInterface.java | `public interface FlowTopologyRepositoryInterface {` |
| KvMetadataRepositoryInterface.java | `public interface KvMetadataRepositoryInterface extends SaveRepositoryInterface<PersistedKvMetadata> {` |
| LocalFlowRepositoryLoader.java | `public class LocalFlowRepositoryLoader {` |
| LogRepositoryInterface.java | `public interface LogRepositoryInterface extends SaveRepositoryInterface<LogEntry>, QueryBuilderInterface<Logs.Fields> {` |
| MetricRepositoryInterface.java | `public interface MetricRepositoryInterface extends SaveRepositoryInterface<MetricEntry>, QueryBuilderInterface<Metrics.Fields> {` |
| NamespaceFileMetadataRepositoryInterface.java | `public interface NamespaceFileMetadataRepositoryInterface extends SaveRepositoryInterface<NamespaceFileMetadata> {` |
| QueryBuilderInterface.java | `public interface QueryBuilderInterface<F extends Enum<F>> {` |
| SaveRepositoryInterface.java | `public interface SaveRepositoryInterface<T> {` |
| ServiceInstanceRepositoryInterface.java | `public interface ServiceInstanceRepositoryInterface {` |
| SettingRepositoryInterface.java | `public interface SettingRepositoryInterface {` |
| TemplateRepositoryInterface.java | `public interface TemplateRepositoryInterface {` |
| TenantMigrationInterface.java | `public interface TenantMigrationInterface {` |
| TriggerRepositoryInterface.java | `public interface TriggerRepositoryInterface extends QueryBuilderInterface<Triggers.Fields> {` |
| WorkerJobRunningRepositoryInterface.java | `public interface WorkerJobRunningRepositoryInterface {` |

### core/runners/
| File | Class Declaration |
|------|-------------------|
| AclChecker.java | `public interface AclChecker {` |
| AclCheckerImpl.java | `class AclCheckerImpl implements AclChecker {` |
| AssetEmit.java | `public record AssetEmit(List<AssetIdentifier> inputs, List<Asset> outputs) {` |
| AssetEmitter.java | `public interface AssetEmitter {` |
| ConcurrencyLimit.java | `public class ConcurrencyLimit implements HasUID {` |
| DefaultFlowMetaStore.java | `public class DefaultFlowMetaStore implements FlowMetaStoreInterface {` |
| DefaultRunContext.java | `public class DefaultRunContext extends RunContext {` |
| ExecutableUtils.java | `public final class ExecutableUtils {` |
| ExecutionDelay.java | `public class ExecutionDelay implements HasUID {` |
| ExecutionQueued.java | `public class ExecutionQueued implements HasUID {` |
| ExecutionResumed.java | `public class ExecutionResumed {` |
| ExecutionRunning.java | `public class ExecutionRunning implements HasUID {` |
| Executor.java | `// TODO for 2.0: this class is used as a queue consumer (which should have been the ExecutorInterface instead),` |
| ExecutorInterface.java | `public interface ExecutorInterface extends Service, Runnable {` |
| ExecutorState.java | `public class ExecutorState implements HasUID {` |
| FilesService.java | `public abstract class FilesService {` |
| FlowInputOutput.java | `* Service class for manipulating Flow's Inputs and Outputs.` |
| FlowListeners.java | `public class FlowListeners implements FlowListenersInterface {` |
| FlowMetaStoreInterface.java | `public interface FlowMetaStoreInterface {` |
| FlowableUtils.java | `public class FlowableUtils {` |
| Indexer.java | `public interface Indexer extends Service, Runnable {` |
| InputAndOutput.java | `public interface InputAndOutput {` |
| InputAndOutputImpl.java | `class InputAndOutputImpl implements InputAndOutput {` |
| LocalPath.java | `* All methods of this class check allowed paths and protect against path traversal.` |
| LocalPathFactory.java | `public class LocalPathFactory {` |
| LocalWorkingDir.java | `public class LocalWorkingDir implements WorkingDir {` |
| MultipleConditionEvent.java | `public record MultipleConditionEvent(Flow flow, Execution execution) implements HasUID {` |
| RunContext.java | `public abstract class RunContext implements PropertyContext {` |
| RunContextCache.java | `public class RunContextCache {` |
| RunContextFactory.java | `public class RunContextFactory {` |
| RunContextInitializer.java | `* This class is responsible to initialize and hydrate a {@link DefaultRunContext} for a specific run context.` |
| RunContextLogger.java | `public class RunContextLogger implements Supplier<org.slf4j.Logger> {` |
| RunContextLoggerFactory.java | `public class RunContextLoggerFactory {` |
| RunContextModule.java | `public class RunContextModule extends SimpleModule {` |
| RunContextProperty.java | `public class RunContextProperty<T> {` |
| RunContextSDKFactory.java | `public class RunContextSDKFactory {` |
| RunContextSerializer.java | `public class RunContextSerializer extends StdSerializer<RunContext> {` |
| RunVariables.java | `public final class RunVariables {` |
| RunnerUtils.java | `public class RunnerUtils {` |
| SDK.java | `public interface SDK {` |
| ScheduleContextInterface.java | `public interface ScheduleContextInterface {` |
| Scheduler.java | `public interface Scheduler extends Service, Runnable {` |
| SchedulerTriggerStateInterface.java | `public interface SchedulerTriggerStateInterface {` |
| Secret.java | `final class Secret {` |
| SecureVariableRendererFactory.java | `public class SecureVariableRendererFactory {` |
| SubflowExecution.java | `public class SubflowExecution<T extends Task & ExecutableTask<?>> implements HasUID {` |
| SubflowExecutionEnd.java | `public class SubflowExecutionEnd implements HasUID {` |
| SubflowExecutionResult.java | `public class SubflowExecutionResult implements HasUID {` |
| VariableRenderer.java | `public class VariableRenderer {` |
| Worker.java | `public interface Worker extends Service, Runnable {` |
| WorkerGroupExecutorInterface.java | `* Service interface for accessing Worker Groups data from a Kestra's Executor service.` |
| WorkerInstance.java | `public record WorkerInstance(` |
| WorkerJob.java | `public abstract class WorkerJob implements HasUID {` |
| WorkerJobResubmit.java | `public class WorkerJobResubmit {` |
| WorkerJobRunning.java | `public abstract class WorkerJobRunning implements HasUID {` |
| WorkerTask.java | `public class WorkerTask extends WorkerJob {` |
| WorkerTaskResult.java | `public class WorkerTaskResult implements HasUID {` |
| WorkerTaskRunning.java | `public class WorkerTaskRunning extends WorkerJobRunning {` |
| WorkerTrigger.java | `public class WorkerTrigger extends WorkerJob {` |
| WorkerTriggerResult.java | `public class WorkerTriggerResult implements HasUID {` |
| WorkerTriggerRunning.java | `public class WorkerTriggerRunning extends WorkerJobRunning {` |
| WorkingDir.java | `* Service interface for accessing a specific working directory.` |
| WorkingDirFactory.java | `* Factory class for the constructing new {@link WorkingDir} objects.` |

### core/runners/pebble/
| File | Class Declaration |
|------|-------------------|
| AbstractDate.java | `public abstract class AbstractDate {` |
| AbstractIndent.java | `public abstract class AbstractIndent {` |
| Extension.java | `public class Extension extends AbstractExtension {` |
| ExtensionCustomizer.java | `public class ExtensionCustomizer extends io.pebbletemplates.pebble.extension.ExtensionCustomizer {` |
| JsonWriter.java | `public class JsonWriter extends OutputWriter implements SpecializedWriter {` |
| OutputWriter.java | `public abstract class OutputWriter extends Writer {` |
| PebbleEngineFactory.java | `public class PebbleEngineFactory {` |
| PebbleLruCache.java | `public class PebbleLruCache implements PebbleCache<Object, PebbleTemplate> {` |
| PebbleUtils.java | `public class PebbleUtils {` |
| TypedObjectWriter.java | `public class TypedObjectWriter extends OutputWriter implements SpecializedWriter {` |

### core/runners/pebble/expression/
| File | Class Declaration |
|------|-------------------|
| InExpression.java | `public class InExpression extends BinaryExpression<Object> {` |
| NullCoalescingExpression.java | `public class NullCoalescingExpression extends BinaryExpression<Object> {` |
| UndefinedCoalescingExpression.java | `public class UndefinedCoalescingExpression extends BinaryExpression<Object> {` |

### core/runners/pebble/filters/
| File | Class Declaration |
|------|-------------------|
| ChunkFilter.java | `public class ChunkFilter implements Filter {` |
| ClassNameFilter.java | `public class ClassNameFilter implements Filter {` |
| DateAddFilter.java | `public class DateAddFilter extends AbstractDate implements Filter {` |
| DateFilter.java | `public class DateFilter extends AbstractDate implements Filter {` |
| DistinctFilter.java | `public class DistinctFilter implements Filter {` |
| EndsWithFilter.java | `public class EndsWithFilter implements Filter {` |
| EscapeCharFilter.java | `public class EscapeCharFilter implements Filter {` |
| FlattenFilter.java | `public class FlattenFilter implements Filter {` |
| IndentFilter.java | `public class IndentFilter extends AbstractIndent implements Filter {` |
| JqFilter.java | `public class JqFilter implements Filter {` |
| JsonFilter.java | `public class JsonFilter extends ToJsonFilter {` |
| KeysFilter.java | `public class KeysFilter implements Filter {` |
| Md5Filter.java | `* This class implements the 'sha256' filter.` |
| NindentFilter.java | `public class NindentFilter extends AbstractIndent implements Filter {` |
| NumberFilter.java | `public class NumberFilter implements Filter {` |
| ReplaceFilter.java | `public class ReplaceFilter implements Filter {` |
| Sha1Filter.java | `* This class implements the 'sha256' filter.` |
| Sha512Filter.java | `* This class implements the 'sha256' filter.` |
| ShaBaseFilter.java | `abstract class ShaBaseFilter implements Filter {` |
| SlugifyFilter.java | `public class SlugifyFilter extends AbstractDate implements Filter {` |
| StartsWithFilter.java | `public class StartsWithFilter implements Filter {` |
| StringFilter.java | `public class StringFilter implements Filter {` |
| SubstringAfterFilter.java | `public class SubstringAfterFilter implements Filter {` |
| SubstringAfterLastFilter.java | `public class SubstringAfterLastFilter implements Filter {` |
| SubstringBeforeFilter.java | `public class SubstringBeforeFilter implements Filter {` |
| SubstringBeforeLastFilter.java | `public class SubstringBeforeLastFilter implements Filter {` |
| TimestampFilter.java | `public class TimestampFilter extends AbstractDate implements Filter {` |
| TimestampMicroFilter.java | `public class TimestampMicroFilter extends AbstractDate implements Filter {` |
| TimestampMilliFilter.java | `public class TimestampMilliFilter extends AbstractDate implements Filter {` |
| TimestampNanoFilter.java | `public class TimestampNanoFilter extends AbstractDate implements Filter {` |
| ToIonFilter.java | `public class ToIonFilter implements Filter {` |
| ToJsonFilter.java | `public class ToJsonFilter implements Filter {` |
| UrlDecoderFilter.java | `public class UrlDecoderFilter implements Filter {` |
| ValuesFilter.java | `public class ValuesFilter implements Filter {` |
| YamlFilter.java | `public class YamlFilter implements Filter {` |

### core/runners/pebble/functions/
| File | Class Declaration |
|------|-------------------|
| AbstractFileFunction.java | `abstract class AbstractFileFunction implements Function {` |
| CurrentEachOutputFunction.java | `public class CurrentEachOutputFunction implements Function {` |
| DecryptFunction.java | `public class DecryptFunction implements Function {` |
| EncryptFunction.java | `public class EncryptFunction implements Function {` |
| ErrorLogsFunction.java | `public class ErrorLogsFunction  implements Function {` |
| FetchContextFunction.java | `public class FetchContextFunction implements Function {` |
| FileExistsFunction.java | `public class FileExistsFunction extends AbstractFileFunction {` |
| FileSizeFunction.java | `public class FileSizeFunction extends AbstractFileFunction {` |
| FileURIFunction.java | `public class FileURIFunction extends AbstractFileFunction {` |
| FromIonFunction.java | `public class FromIonFunction implements Function {` |
| FromJsonFunction.java | `public class FromJsonFunction implements Function {` |
| HttpFunction.java | `public class HttpFunction<T> implements Function {` |
| IDFunction.java | `public class IDFunction implements Function {` |
| IsFileEmptyFunction.java | `public class IsFileEmptyFunction extends AbstractFileFunction {` |
| JsonFunction.java | `public class JsonFunction extends FromJsonFunction {` |
| KSUIDFunction.java | `public class KSUIDFunction implements Function {` |
| KvFunction.java | `public class KvFunction implements Function {` |
| NanoIDFunction.java | `public class NanoIDFunction implements Function {` |
| NowFunction.java | `public class NowFunction extends AbstractDate implements Function {` |
| RandomIntFunction.java | `public class RandomIntFunction implements Function {` |
| RandomPortFunction.java | `public class RandomPortFunction implements Function {` |
| ReadFileFunction.java | `public class ReadFileFunction extends AbstractFileFunction {` |
| RenderFunction.java | `public class RenderFunction implements Function, RenderingFunctionInterface {` |
| RenderOnceFunction.java | `public class RenderOnceFunction extends RenderFunction {` |
| RenderingFunctionInterface.java | `public interface RenderingFunctionInterface {` |
| SecretFunction.java | `public class SecretFunction implements Function {` |
| TasksWithStateFunction.java | `public class TasksWithStateFunction implements Function {` |
| UUIDFunction.java | `public class UUIDFunction implements Function {` |
| YamlFunction.java | `public class YamlFunction implements Function {` |

### core/runners/pebble/tests/
| File | Class Declaration |
|------|-------------------|
| JsonTest.java | `public class JsonTest implements Test {` |

### core/secret/
| File | Class Declaration |
|------|-------------------|
| SecretException.java | `public class SecretException extends KestraRuntimeException {` |
| SecretNotFoundException.java | `public class SecretNotFoundException extends SecretException {` |
| SecretPluginInterface.java | `public interface SecretPluginInterface extends io.kestra.core.models.Plugin {` |
| SecretService.java | `public class SecretService<META> {` |

### core/serializers/
| File | Class Declaration |
|------|-------------------|
| DurationDeserializer.java | `public class DurationDeserializer extends com.fasterxml.jackson.datatype.jsr310.deser.DurationDeserializer {` |
| FileSerde.java | `public final class FileSerde {` |
| JacksonMapper.java | `public final class JacksonMapper {` |
| ListOrMapOfLabelDeserializer.java | `public class ListOrMapOfLabelDeserializer extends JsonDeserializer<List<Label>> implements ResolvableDeserializer {` |
| ListOrMapOfLabelSerializer.java | `public class ListOrMapOfLabelSerializer extends JsonSerializer<Object> {` |
| ObjectMapperFactory.java | `public class ObjectMapperFactory extends io.micronaut.jackson.ObjectMapperFactory {` |
| TenantSerializer.java | `public class TenantSerializer extends BeanSerializerModifier {` |
| YamlParser.java | `public final class YamlParser {` |

### core/serializers/ion/
| File | Class Declaration |
|------|-------------------|
| IonFactory.java | `public class IonFactory extends com.fasterxml.jackson.dataformat.ion.IonFactory {` |
| IonGenerator.java | `public class IonGenerator extends com.fasterxml.jackson.dataformat.ion.IonGenerator {` |
| IonModule.java | `public class IonModule extends SimpleModule {` |
| IonParser.java | `public class IonParser extends com.fasterxml.jackson.dataformat.ion.IonParser {` |

### core/server/
| File | Class Declaration |
|------|-------------------|
| AbstractServiceLivenessCoordinator.java | `* Base class for coordinating service liveness.` |
| AbstractServiceLivenessTask.java | `* Base class for scheduling a task that operate on Worker liveness.` |
| ClusterEvent.java | `public record ClusterEvent(String uid, EventType eventType, LocalDateTime eventDate, String message) implements HasUID {` |
| LocalServiceState.java | `* Immutable class holding a {@link Service} and its {@link ServiceInstance}.` |
| LocalServiceStateFactory.java | `public class LocalServiceStateFactory {` |
| Metric.java | `public record Metric(` |
| ServerConfig.java | `public record ServerConfig(` |
| ServerInstance.java | `public record ServerInstance(` |
| ServerInstanceFactory.java | `public class ServerInstanceFactory {` |
| Service.java | `public interface Service extends AutoCloseable {` |
| ServiceInstance.java | `public record ServiceInstance(` |
| ServiceLivenessManager.java | `* Moreover, this class periodically send state updates (a.k.a. heartbeats) to indicate service's liveness.` |
| ServiceLivenessStore.java | `* Service interface for querying the state of service instances.` |
| ServiceLivenessUpdater.java | `* Service interface for updating the state of a service instance.` |
| ServiceRegistry.java | `public final class ServiceRegistry {` |
| ServiceStateChangeEvent.java | `public final class ServiceStateChangeEvent extends ApplicationEvent {` |
| ServiceStateTransition.java | `public final class ServiceStateTransition {` |
| ServiceType.java | `public enum ServiceType {` |
| WorkerTaskRestartStrategy.java | `public enum WorkerTaskRestartStrategy {` |

### core/services/
| File | Class Declaration |
|------|-------------------|
| AbstractFilterService.java | `public abstract class AbstractFilterService<Q> {` |
| ConcurrencyLimitService.java | `public interface ConcurrencyLimitService {` |
| ConditionService.java | `public class ConditionService {` |
| DefaultNamespaceService.java | `public class DefaultNamespaceService implements NamespaceService {` |
| ExecutionLogService.java | `public class ExecutionLogService {` |
| ExecutionService.java | `public class ExecutionService {` |
| ExecutionStreamingService.java | `public class ExecutionStreamingService {` |
| FlowListenersInterface.java | `public interface FlowListenersInterface {` |
| FlowService.java | `public class FlowService {` |
| Graph2DotService.java | `public class Graph2DotService {` |
| GraphService.java | `public class GraphService {` |
| IgnoreExecutionService.java | `public class IgnoreExecutionService {` |
| InstanceService.java | `public class InstanceService {` |
| KVStoreService.java | `public class KVStoreService {` |
| LabelService.java | `public final class LabelService {` |
| LogStreamingService.java | `public class LogStreamingService {` |
| MaintenanceService.java | `public interface MaintenanceService {` |
| NamespaceService.java | `public interface NamespaceService {` |
| PluginDefaultService.java | `public class PluginDefaultService {` |
| PluginGlobalDefaultConfiguration.java | `public class PluginGlobalDefaultConfiguration {` |
| StartExecutorService.java | `public class StartExecutorService {` |
| StorageService.java | `public abstract class StorageService {` |
| TaskGlobalDefaultConfiguration.java | `public class TaskGlobalDefaultConfiguration {` |
| VariablesService.java | `public class VariablesService {` |
| VersionService.java | `public class VersionService {` |
| WebhookService.java | `public class WebhookService {` |
| WorkerGroupService.java | `public class WorkerGroupService {` |

### core/storages/
| File | Class Declaration |
|------|-------------------|
| FileAttributes.java | `public interface FileAttributes {` |
| InternalNamespace.java | `* This class acts as a facade to the {@link StorageInterface} for manipulating namespace files.` |
| InternalStorage.java | `public class InternalStorage implements Storage {` |
| Namespace.java | `* Service interface for accessing the files attached to a namespace (a.k.a., Namespace Files).` |
| NamespaceFactory.java | `public class NamespaceFactory {` |
| NamespaceFile.java | `public record NamespaceFile(` |
| NamespaceFileAttributes.java | `public class NamespaceFileAttributes implements FileAttributes {` |
| NamespaceFileRevision.java | `public record NamespaceFileRevision(Integer revision) {}` |
| StateStore.java | `public record StateStore(RunContext runContext, boolean hashTaskRunValue) {` |
| Storage.java | `* Service interface for accessing the Kestra's storage.` |
| StorageConfiguration.java | `public interface StorageConfiguration {` |
| StorageContext.java | `public class StorageContext {` |
| StorageInterface.java | `public interface StorageInterface extends AutoCloseable, Plugin {` |
| StorageInterfaceFactory.java | `* Factor class for constructing {@link StorageInterface} objects.` |
| StorageObject.java | `public record StorageObject(Map<String, String> metadata, InputStream inputStream) {` |
| StorageSplitInterface.java | `public interface StorageSplitInterface {` |

### core/storages/kv/
| File | Class Declaration |
|------|-------------------|
| InternalKVStore.java | `public class InternalKVStore implements KVStore {` |
| KVEntry.java | `public record KVEntry(String namespace, String key, Integer version, @Nullable String description, Instant creationDate, Instant updateDate, @Nullable Instant expirationDate) {` |
| KVMetadata.java | `public class KVMetadata {` |
| KVPurgeCleaner.java | `public class KVPurgeCleaner {` |
| KVStore.java | `* Service interface for accessing the files attached to a namespace Key-Value store.` |
| KVStoreException.java | `* The base class for all other KVStore exceptions.` |
| KVValue.java | `public record KVValue(@Nullable Object value) {` |
| KVValueAndMetadata.java | `public record KVValueAndMetadata(@Nullable KVMetadata metadata, @Nullable Object value) {` |

### core/tenant/
| File | Class Declaration |
|------|-------------------|
| TenantService.java | `public class TenantService {` |

### core/test/
| File | Class Declaration |
|------|-------------------|
| TestState.java | `public enum TestState {` |
| TestSuite.java | `public class TestSuite implements HasUID, TenantInterface, SoftDeletable<TestSuite>, HasSource {` |
| TestSuiteRunEntity.java | `public record TestSuiteRunEntity(` |
| TestSuiteRunResult.java | `public record TestSuiteRunResult(` |
| TestSuiteUid.java | `public record TestSuiteUid(String tenant, String namespace, String id) {` |

### core/test/flow/
| File | Class Declaration |
|------|-------------------|
| Assertion.java | `public class Assertion {` |
| AssertionResult.java | `public record AssertionResult(` |
| AssertionRunError.java | `public record AssertionRunError(@NotNull String message, String details) {` |
| Fixtures.java | `public class Fixtures {` |
| TaskFixture.java | `public class TaskFixture {` |
| TriggerFixture.java | `public class TriggerFixture {` |
| UnitTest.java | `public class UnitTest {` |
| UnitTestResult.java | `public record UnitTestResult(` |

### core/topologies/
| File | Class Declaration |
|------|-------------------|
| FlowTopologyService.java | `public class FlowTopologyService {` |

### core/trace/
| File | Class Declaration |
|------|-------------------|
| DefaultTracer.java | `class DefaultTracer implements Tracer {` |
| NoopTracer.java | `class NoopTracer implements Tracer {` |
| TraceLevel.java | `public enum TraceLevel {` |
| TraceUtils.java | `public final class TraceUtils {` |
| Tracer.java | `public interface Tracer {` |
| TracerFactory.java | `public class TracerFactory {` |
| TracesConfiguration.java | `public record TracesConfiguration (` |

### core/trace/propagation/
| File | Class Declaration |
|------|-------------------|
| ExecutionTextMapGetter.java | `public class ExecutionTextMapGetter implements TextMapGetter<Execution> {` |
| ExecutionTextMapSetter.java | `public class ExecutionTextMapSetter implements TextMapSetter<Execution> {` |
| RunContextTextMapGetter.java | `public class RunContextTextMapGetter implements TextMapGetter<RunContext> {` |
| RunContextTextMapSetter.java | `public class RunContextTextMapSetter implements TextMapSetter<RunContext> {` |

### core/utils/
| File | Class Declaration |
|------|-------------------|
| AuthUtils.java | `public class AuthUtils {` |
| Await.java | `public class Await {` |
| DateUtils.java | `public class DateUtils {` |
| Debug.java | `public class Debug {` |
| Disposable.java | `public interface Disposable {` |
| DurationOrSizeTrigger.java | `public class DurationOrSizeTrigger<V> implements Predicate<Collection<V>> {` |
| EditionProvider.java | `public class EditionProvider {` |
| Either.java | `public abstract sealed class Either<L, R> permits Either.Left, Either.Right {` |
| Enums.java | `public final class Enums {` |
| Exceptions.java | `public interface Exceptions {` |
| ExecutorsUtils.java | `* Utility class to create {@link java.util.concurrent.ExecutorService} with {@link java.util.concurrent.ExecutorService} instances.` |
| FileUtils.java | `public final class FileUtils {` |
| GraphUtils.java | `public class GraphUtils {` |
| Hashing.java | `public final class Hashing {` |
| IdUtils.java | `abstract public class IdUtils {` |
| KestraIgnore.java | `public class KestraIgnore {` |
| ListUtils.java | `public class ListUtils {` |
| Logs.java | `* Utility class for server logging` |
| MapUtils.java | `public class MapUtils {` |
| MathUtils.java | `public class MathUtils {` |
| NamespaceFilesUtils.java | `public final class NamespaceFilesUtils {` |
| Network.java | `public final class Network {` |
| PathMatcherPredicate.java | `public final class PathMatcherPredicate implements Predicate<Path> {` |
| PathUtil.java | `public class PathUtil {` |
| ReadOnlyDelegatingMap.java | `public abstract class ReadOnlyDelegatingMap<K, V> implements Map<K, V> {` |
| RegexPatterns.java | `public class RegexPatterns {` |
| Rethrow.java | `public final class Rethrow {` |
| RetryUtils.java | `public final class RetryUtils {` |
| Slugify.java | `public class Slugify {` |
| ThreadMainFactoryBuilder.java | `public final class ThreadMainFactoryBuilder {` |
| ThreadUncaughtExceptionHandler.java | `public final class ThreadUncaughtExceptionHandler implements UncaughtExceptionHandler {` |
| TruthUtils.java | `abstract public class TruthUtils {` |
| UnixModeToPosixFilePermissions.java | `public final class UnixModeToPosixFilePermissions {` |
| UriProvider.java | `public class UriProvider {` |
| Version.java | `* A version class which supports the following pattern :` |
| VersionProvider.java | `public class VersionProvider {` |
| WindowsUtils.java | `public class WindowsUtils {` |

### core/validations/
| File | Class Declaration |
|------|-------------------|
| AbstractWebhookValidation.java | `@Constraint(validatedBy = { AbstractWebhookValidator.class })` |
| AppConfigValidator.java | `public class AppConfigValidator {` |
| ArrayInputValidation.java | `public @interface ArrayInputValidation {` |
| ConstantRetryValidation.java | `public @interface ConstantRetryValidation {` |
| DagTaskValidation.java | `public @interface DagTaskValidation {` |
| DashboardWindowValidation.java | `public @interface DashboardWindowValidation {` |
| DataChartKPIValidation.java | `public @interface DataChartKPIValidation {` |
| DataChartValidation.java | `public @interface DataChartValidation {` |
| DateFormat.java | `public @interface DateFormat {` |
| ExecutionsDataFilterKPIValidation.java | `public @interface ExecutionsDataFilterKPIValidation {` |
| ExecutionsDataFilterValidation.java | `public @interface ExecutionsDataFilterValidation {` |
| ExponentialRetryValidation.java | `public @interface ExponentialRetryValidation {` |
| FileInputValidation.java | `public @interface FileInputValidation {` |
| FilesVersionBehaviorValidation.java | `public @interface FilesVersionBehaviorValidation {` |
| FlowValidation.java | `public @interface FlowValidation {` |
| InputValidation.java | `public @interface InputValidation {` |
| JsonString.java | `public @interface JsonString {` |
| KvVersionBehaviorValidation.java | `public @interface KvVersionBehaviorValidation {` |
| MultiselectInputValidation.java | `public @interface MultiselectInputValidation {` |
| NoSystemLabelValidation.java | `public @interface NoSystemLabelValidation {` |
| OrFilterValidation.java | `public @interface OrFilterValidation {` |
| PluginDefaultValidation.java | `public @interface PluginDefaultValidation {` |
| PreconditionFilterValidation.java | `public @interface PreconditionFilterValidation {` |
| RandomRetryValidation.java | `public @interface RandomRetryValidation {` |
| Regex.java | `public @interface Regex {` |
| ScheduleValidation.java | `public @interface ScheduleValidation {` |
| ServerCommandValidator.java | `public class ServerCommandValidator {` |
| SwitchTaskValidation.java | `public @interface SwitchTaskValidation {` |
| TableChartValidation.java | `public @interface TableChartValidation {` |
| TestSuiteAssertionValidation.java | `public @interface TestSuiteAssertionValidation {` |
| TestSuiteValidation.java | `public @interface TestSuiteValidation {` |
| TimeSeriesChartValidation.java | `public @interface TimeSeriesChartValidation {` |
| TimeWindowValidation.java | `public @interface TimeWindowValidation {` |
| TimezoneId.java | `public @interface TimezoneId {` |
| WebhookValidation.java | `@Constraint(validatedBy = { WebhookValidator.class })` |
| WorkingDirectoryTaskValidation.java | `public @interface WorkingDirectoryTaskValidation {` |

### core/validations/factory/
| File | Class Declaration |
|------|-------------------|
| CustomValidatorFactoryProvider.java | `public class CustomValidatorFactoryProvider {` |

### core/validations/validator/
| File | Class Declaration |
|------|-------------------|
| AbstractWebhookValidator.java | `public class AbstractWebhookValidator implements ConstraintValidator<AbstractWebhookValidation, AbstractWebhookTrigger> {` |
| ArrayInputValidator.java | `public class ArrayInputValidator implements ConstraintValidator<ArrayInputValidation, ArrayInput> {` |
| ConstantRetryValidator.java | `public class ConstantRetryValidator implements ConstraintValidator<ConstantRetryValidation, Constant> {` |
| DagTaskValidator.java | `public class DagTaskValidator  implements ConstraintValidator<DagTaskValidation, Dag> {` |
| DashboardWindowValidator.java | `public class DashboardWindowValidator implements ConstraintValidator<DashboardWindowValidation, TimeWindow> {` |
| DataChartKPIValidator.java | `public class DataChartKPIValidator implements ConstraintValidator<DataChartKPIValidation, DataChartKPI<?, ?>> {` |
| DataChartValidator.java | `public class DataChartValidator implements ConstraintValidator<DataChartValidation, DataChart<?, ?>> {` |
| DateFormatValidator.java | `public class DateFormatValidator implements ConstraintValidator<DateFormat, String> {` |
| ExecutionsDataFilterKPIValidator.java | `public class ExecutionsDataFilterKPIValidator implements ConstraintValidator<ExecutionsDataFilterValidation, ExecutionsKPI<?>> {` |
| ExecutionsDataFilterValidator.java | `public class ExecutionsDataFilterValidator implements ConstraintValidator<ExecutionsDataFilterValidation, Executions<?>> {` |
| ExponentialRetryValidator.java | `public class ExponentialRetryValidator implements ConstraintValidator<ExponentialRetryValidation, Exponential> {` |
| FileInputValidator.java | `public class FileInputValidator implements ConstraintValidator<FileInputValidation, FileInput> {` |
| FilesVersionBehaviorValidator.java | `public class FilesVersionBehaviorValidator implements ConstraintValidator<FilesVersionBehaviorValidation, Version> {` |
| FlowValidator.java | `public class FlowValidator implements ConstraintValidator<FlowValidation, Flow> {` |
| InputValidator.java | `public class InputValidator implements ConstraintValidator<InputValidation, Input<?>> {` |
| JsonStringValidator.java | `public class JsonStringValidator  implements ConstraintValidator<JsonString, String> {` |
| KvVersionBehaviorValidator.java | `public class KvVersionBehaviorValidator implements ConstraintValidator<KvVersionBehaviorValidation, Version> {` |
| MultiselectInputValidator.java | `public class MultiselectInputValidator implements ConstraintValidator<MultiselectInputValidation, MultiselectInput> {` |
| NoSystemLabelValidator.java | `public class NoSystemLabelValidator implements ConstraintValidator<NoSystemLabelValidation, Label> {` |
| OrFilterValidator.java | `public class OrFilterValidator implements ConstraintValidator<OrFilterValidation, Or<?>> {` |
| PluginDefaultValidator.java | `public class PluginDefaultValidator implements ConstraintValidator<PluginDefaultValidation, PluginDefault> {` |
| PreconditionFilterValidator.java | `public class PreconditionFilterValidator implements ConstraintValidator<PreconditionFilterValidation, Flow.Filter> {` |
| RandomRetryValidator.java | `public class RandomRetryValidator implements ConstraintValidator<RandomRetryValidation, Random> {` |
| RegexValidator.java | `public class RegexValidator implements ConstraintValidator<Regex, String> {` |
| ScheduleValidator.java | `public class ScheduleValidator implements ConstraintValidator<ScheduleValidation, Schedule> {` |
| SwitchTaskValidator.java | `public class SwitchTaskValidator implements ConstraintValidator<SwitchTaskValidation, Switch> {` |
| TableChartValidator.java | `public class TableChartValidator implements ConstraintValidator<TableChartValidation, Table<?, ?>> {` |
| TestSuiteAssertionValidator.java | `public class TestSuiteAssertionValidator implements ConstraintValidator<TestSuiteAssertionValidation, Assertion> {` |
| TestSuiteValidator.java | `public class TestSuiteValidator implements ConstraintValidator<TestSuiteValidation, TestSuite> {` |
| TimeSeriesChartValidator.java | `public class TimeSeriesChartValidator implements ConstraintValidator<TimeSeriesChartValidation, TimeSeries<?, ?>> {` |
| TimeWindowValidator.java | `public class TimeWindowValidator implements ConstraintValidator<TimeWindowValidation, TimeWindow> {` |
| TimezoneIdValidator.java | `public class TimezoneIdValidator implements ConstraintValidator<TimezoneId, String> {` |
| WebhookValidator.java | `public class WebhookValidator implements ConstraintValidator<WebhookValidation, Webhook> {` |
| WorkingDirectoryTaskValidator.java | `public class WorkingDirectoryTaskValidator implements ConstraintValidator<WorkingDirectoryTaskValidation, WorkingDirectory> {` |

---

## Internal Plugins: io.kestra.plugin.core (129 files)


### plugin/core/condition/
| File | Class Declaration |
|------|-------------------|
| DateTimeBetween.java | `public class DateTimeBetween extends Condition implements ScheduleCondition {` |
| DayWeek.java | `public class DayWeek extends Condition implements ScheduleCondition {` |
| DayWeekInMonth.java | `public class DayWeekInMonth extends Condition implements ScheduleCondition {` |
| ExecutionFlow.java | `public class ExecutionFlow extends Condition {` |
| ExecutionLabels.java | `public class ExecutionLabels extends Condition {` |
| ExecutionNamespace.java | `public class ExecutionNamespace extends Condition {` |
| ExecutionOutputs.java | `public class ExecutionOutputs extends Condition {` |
| ExecutionStatus.java | `public class ExecutionStatus extends Condition {` |
| Expression.java | `public class Expression extends Condition {` |
| FlowCondition.java | `public class FlowCondition extends Condition {` |
| FlowNamespaceCondition.java | `public class FlowNamespaceCondition extends Condition {` |
| HasRetryAttempt.java | `public class HasRetryAttempt extends Condition {` |
| MultipleCondition.java | `public class MultipleCondition extends Condition implements io.kestra.core.models.triggers.multipleflows.MultipleCondition {` |
| Not.java | `public class Not extends Condition implements ScheduleCondition {` |
| Or.java | `public class Or extends Condition implements ScheduleCondition {` |
| PublicHoliday.java | `public class PublicHoliday extends Condition implements ScheduleCondition {` |
| TimeBetween.java | `public class TimeBetween extends Condition implements ScheduleCondition {` |
| Weekend.java | `public class Weekend extends Condition implements ScheduleCondition {` |

### plugin/core/dashboard/chart/
| File | Class Declaration |
|------|-------------------|
| Bar.java | `public class Bar<F extends Enum<F>, D extends DataFilter<F, ? extends ColumnDescriptor<F>>> extends DataChart<BarOption, D> {` |
| KPI.java | `public class KPI <F extends Enum<F>, D extends DataFilterKPI<F, ? extends ColumnDescriptor<F>>> extends DataChartKPI<KpiOption, D> {` |
| Markdown.java | `public class Markdown extends Chart<ChartOption> {` |
| Pie.java | `public class Pie<F extends Enum<F>, D extends DataFilter<F, ? extends ColumnDescriptor<F>>> extends DataChart<PieOption, D> {` |
| Table.java | `public class Table<F extends Enum<F>, D extends DataFilter<F, ? extends TableColumnDescriptor<F>>> extends DataChart<TableOption, D> {` |
| TimeSeries.java | `public class TimeSeries<F extends Enum<F>, D extends DataFilter<F, ? extends TimeSeriesColumnDescriptor<F>>> extends DataChart<TimeSeriesOption, D> {` |

### plugin/core/dashboard/chart/bars/
| File | Class Declaration |
|------|-------------------|
| BarOption.java | `public class BarOption extends ChartOption implements WithLegend, WithTooltip {` |

### plugin/core/dashboard/chart/kpis/
| File | Class Declaration |
|------|-------------------|
| KpiOption.java | `public class KpiOption extends ChartOption {` |

### plugin/core/dashboard/chart/mardown/sources/
| File | Class Declaration |
|------|-------------------|
| FlowDescription.java | `public class FlowDescription extends MarkdownSource {` |
| MarkdownSource.java | `public class MarkdownSource {` |
| Text.java | `public class Text extends MarkdownSource {` |

### plugin/core/dashboard/chart/pies/
| File | Class Declaration |
|------|-------------------|
| PieOption.java | `public class PieOption extends ChartOption implements WithLegend, WithTooltip {` |

### plugin/core/dashboard/chart/tables/
| File | Class Declaration |
|------|-------------------|
| TableColumnDescriptor.java | `public class TableColumnDescriptor<F extends Enum<F>> extends ColumnDescriptor<F> {` |
| TableOption.java | `public class TableOption extends ChartOption {` |

### plugin/core/dashboard/chart/timeseries/
| File | Class Declaration |
|------|-------------------|
| TimeSeriesColumnDescriptor.java | `public class TimeSeriesColumnDescriptor<F extends Enum<F>> extends ColumnDescriptor<F> {` |
| TimeSeriesOption.java | `public class TimeSeriesOption extends ChartOption implements WithLegend, WithTooltip {` |

### plugin/core/dashboard/data/
| File | Class Declaration |
|------|-------------------|
| Executions.java | `public class Executions<C extends ColumnDescriptor<Executions.Fields>> extends DataFilter<Executions.Fields, C> implements IExecutions {` |
| ExecutionsKPI.java | `public class ExecutionsKPI<C extends ColumnDescriptor<ExecutionsKPI.Fields>> extends DataFilterKPI<ExecutionsKPI.Fields, C> implements IExecutions {` |
| Flows.java | `public class Flows<C extends ColumnDescriptor<Flows.Fields>> extends DataFilter<Flows.Fields, C> implements IFlows {` |
| FlowsKPI.java | `public class FlowsKPI<C extends ColumnDescriptor<FlowsKPI.Fields>> extends DataFilterKPI<FlowsKPI.Fields, C> implements IFlows {` |
| IData.java | `public interface IData<F extends Enum<F>> {` |
| IExecutions.java | `public interface IExecutions extends IData<IExecutions.Fields> {` |
| IFlows.java | `public interface IFlows extends IData<IFlows.Fields> {` |
| ILogs.java | `public interface ILogs extends IData<ILogs.Fields> {` |
| IMetrics.java | `public interface IMetrics extends IData<IMetrics.Fields> {` |
| ITriggers.java | `public interface ITriggers extends IData<ITriggers.Fields> {` |
| Logs.java | `public class Logs<C extends ColumnDescriptor<ILogs.Fields>> extends DataFilter<ILogs.Fields, C> implements ILogs {` |
| LogsKPI.java | `public class LogsKPI<C extends ColumnDescriptor<LogsKPI.Fields>> extends DataFilterKPI<LogsKPI.Fields, C> implements ILogs {` |
| Metrics.java | `public class Metrics<C extends ColumnDescriptor<Metrics.Fields>> extends DataFilter<Metrics.Fields, C> implements IMetrics {` |
| MetricsKPI.java | `public class MetricsKPI<C extends ColumnDescriptor<MetricsKPI.Fields>> extends DataFilterKPI<MetricsKPI.Fields, C> implements IMetrics {` |
| Triggers.java | `public class Triggers<C extends ColumnDescriptor<Triggers.Fields>> extends DataFilter<Triggers.Fields, C> implements ITriggers {` |

### plugin/core/debug/
| File | Class Declaration |
|------|-------------------|
| Echo.java | `public class Echo extends Task implements RunnableTask<VoidOutput> {` |
| Return.java | `public class Return extends Task implements RunnableTask<Return.Output> {` |

### plugin/core/execution/
| File | Class Declaration |
|------|-------------------|
| Assert.java | `public class Assert extends Task implements RunnableTask<VoidOutput> {` |
| Count.java | `public class Count extends Task implements RunnableTask<Count.Output> {` |
| Exit.java | `public class Exit extends Task implements ExecutionUpdatableTask {` |
| Fail.java | `public class Fail extends Task implements RunnableTask<VoidOutput> {` |
| Labels.java | `public class Labels extends Task implements ExecutionUpdatableTask {` |
| PurgeExecutions.java | `public class PurgeExecutions extends Task implements RunnableTask<PurgeExecutions.Output> {` |
| Resume.java | `public class Resume  extends Task implements RunnableTask<VoidOutput> {` |
| SetVariables.java | `public class SetVariables extends Task implements ExecutionUpdatableTask {` |
| UnsetVariables.java | `public class UnsetVariables extends Task implements ExecutionUpdatableTask {` |

### plugin/core/flow/
| File | Class Declaration |
|------|-------------------|
| AllowFailure.java | `public class AllowFailure extends Sequential implements FlowableTask<VoidOutput> {` |
| ChildFlowInterface.java | `public interface ChildFlowInterface {` |
| Dag.java | `public class Dag extends Task implements FlowableTask<VoidOutput> {` |
| EachParallel.java | `public class EachParallel extends Parallel implements FlowableTask<VoidOutput> {` |
| EachSequential.java | `public class EachSequential extends Sequential implements FlowableTask<VoidOutput> {` |
| ForEach.java | `public class ForEach extends Sequential implements FlowableTask<VoidOutput> {` |
| ForEachItem.java | `public class ForEachItem extends Task implements FlowableTask<VoidOutput>, ChildFlowInterface {` |
| If.java | `public class If extends Task implements FlowableTask<If.Output> {` |
| LoopUntil.java | `public class LoopUntil extends Task implements FlowableTask<LoopUntil.Output> {` |
| Parallel.java | `public class Parallel extends Task implements FlowableTask<VoidOutput> {` |
| Pause.java | `public class Pause extends Task implements FlowableTask<Pause.Output> {` |
| Sequential.java | `public class Sequential extends Task implements FlowableTask<VoidOutput> {` |
| Sleep.java | `public class Sleep extends Task implements RunnableTask<VoidOutput> {` |
| Subflow.java | `public class Subflow extends Task implements ExecutableTask<Subflow.Output>, ChildFlowInterface {` |
| Switch.java | `public class Switch extends Task implements FlowableTask<Switch.Output> {` |
| Template.java | `public class Template extends Task implements FlowableTask<Template.Output> {` |
| WorkingDirectory.java | `public class WorkingDirectory extends Sequential implements NamespaceFilesInterface, InputFilesInterface, OutputFilesInterface {` |

### plugin/core/http/
| File | Class Declaration |
|------|-------------------|
| AbstractHttp.java | `public abstract class AbstractHttp extends Task implements HttpInterface {` |
| Download.java | `public class Download extends AbstractHttp implements RunnableTask<Download.Output> {` |
| HttpInterface.java | `public interface HttpInterface {` |
| Request.java | `public class Request extends AbstractHttp implements RunnableTask<Request.Output> {` |
| SseRequest.java | `public class SseRequest extends AbstractHttp implements RunnableTask<SseRequest.Output> {` |
| Trigger.java | `public class Trigger extends AbstractTrigger implements PollingTriggerInterface, HttpInterface, TriggerOutput<Request.Output> {` |

### plugin/core/kv/
| File | Class Declaration |
|------|-------------------|
| Delete.java | `public class Delete extends Task implements RunnableTask<Delete.Output> {` |
| Get.java | `public class Get extends Task implements RunnableTask<Get.Output> {` |
| GetKeys.java | `public class GetKeys extends Task implements RunnableTask<GetKeys.Output> {` |
| Key.java | `public class Key extends KvPurgeBehavior {` |
| KvPurgeBehavior.java | `public abstract class KvPurgeBehavior {` |
| PurgeKV.java | `public class PurgeKV extends Task implements PurgeTask<KVEntry>, RunnableTask<PurgeKV.Output> {` |
| Put.java | `public class Put extends Task implements RunnableTask<VoidOutput> {` |
| Set.java | `public class Set extends Task implements RunnableTask<VoidOutput> {` |
| Version.java | `public class Version extends KvPurgeBehavior {` |

### plugin/core/log/
| File | Class Declaration |
|------|-------------------|
| Fetch.java | `public class Fetch extends Task implements RunnableTask<Fetch.Output> {` |
| Log.java | `public class Log extends Task implements RunnableTask<VoidOutput> {` |
| PurgeLogs.java | `public class PurgeLogs extends Task implements RunnableTask<PurgeLogs.Output> {` |

### plugin/core/metric/
| File | Class Declaration |
|------|-------------------|
| Publish.java | `public class Publish extends Task implements RunnableTask<VoidOutput> {` |

### plugin/core/namespace/
| File | Class Declaration |
|------|-------------------|
| DeleteFiles.java | `public class DeleteFiles extends Task implements RunnableTask<Output> {` |
| DownloadFiles.java | `public class DownloadFiles extends Task implements RunnableTask<DownloadFiles.Output> {` |
| FilesPurgeBehavior.java | `public abstract class FilesPurgeBehavior {` |
| PurgeFiles.java | `public class PurgeFiles extends Task implements PurgeTask<NamespaceFile>, RunnableTask<PurgeFiles.Output> {` |
| UploadFiles.java | `public class UploadFiles extends Task implements RunnableTask<UploadFiles.Output> {` |
| Version.java | `public class Version extends FilesPurgeBehavior {` |

### plugin/core/output/
| File | Class Declaration |
|------|-------------------|
| OutputValues.java | `public class OutputValues extends Task implements RunnableTask<OutputValues.Output> {` |

### plugin/core/purge/
| File | Class Declaration |
|------|-------------------|
| PurgeTask.java | `public interface PurgeTask<T> {` |

### plugin/core/runner/
| File | Class Declaration |
|------|-------------------|
| Process.java | `public class Process extends TaskRunner<TaskRunnerDetailResult> {` |

### plugin/core/state/
| File | Class Declaration |
|------|-------------------|
| AbstractState.java | `public abstract class AbstractState extends Task {` |
| Delete.java | `public class Delete extends AbstractState implements RunnableTask<Delete.Output> {` |
| Get.java | `public class Get extends AbstractState implements RunnableTask<Get.Output> {` |
| Set.java | `public class Set extends AbstractState implements RunnableTask<Set.Output> {` |

### plugin/core/storage/
| File | Class Declaration |
|------|-------------------|
| Concat.java | `public class Concat extends Task implements RunnableTask<Concat.Output> {` |
| DeduplicateItems.java | `public class DeduplicateItems extends Task implements RunnableTask<DeduplicateItems.Output> {` |
| Delete.java | `public class Delete extends Task implements RunnableTask<Delete.Output> {` |
| FilterItems.java | `public class FilterItems extends Task implements RunnableTask<FilterItems.Output> {` |
| LocalFiles.java | `public class LocalFiles extends Task implements RunnableTask<LocalFiles.LocalFilesOutput> {` |
| PurgeCurrentExecutionFiles.java | `public class PurgeCurrentExecutionFiles extends Task implements RunnableTask<PurgeCurrentExecutionFiles.Output> {` |
| Reverse.java | `public class Reverse extends Task implements RunnableTask<Reverse.Output> {` |
| Size.java | `public class Size extends Task implements RunnableTask<Size.Output> {` |
| Split.java | `public class Split extends Task implements RunnableTask<Split.Output>, StorageSplitInterface {` |
| Write.java | `public class Write extends Task implements RunnableTask<Write.Output> {` |

### plugin/core/templating/
| File | Class Declaration |
|------|-------------------|
| TemplatedTask.java | `public class TemplatedTask extends Task implements RunnableTask<Output> {` |

### plugin/core/trigger/
| File | Class Declaration |
|------|-------------------|
| AbstractWebhookTrigger.java | `* Abstract base class for webhook triggers that provides common properties and execution creation logic.` |
| Flow.java | `public class Flow extends AbstractTrigger implements TriggerOutput<Flow.Output> {` |
| SchedulableExecutionFactory.java | `* Factory class for constructing a new {@link Execution} from a {@link Schedulable} trigger.` |
| Schedule.java | `public class Schedule extends AbstractTrigger implements Schedulable, TriggerOutput<Schedule.Output> {` |
| ScheduleOnDates.java | `public class ScheduleOnDates extends AbstractTrigger implements Schedulable, TriggerOutput<VoidOutput> {` |
| Toggle.java | `public class Toggle extends Task implements RunnableTask<VoidOutput> {` |
| Webhook.java | `public class Webhook extends AbstractWebhookTrigger implements TriggerOutput<Webhook.Output> {` |
| WebhookContext.java | `public record WebhookContext(` |
| WebhookResponse.java | `public record WebhookResponse(` |

---
**Verification:** 761 engine + 129 plugin = 890 total files inventoried.
