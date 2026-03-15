export type IntegrationTask = {
  item_id: string;
  task_class: string;
  task_title: string | null;
  task_description: string | null;
  categories: string[];
  plugin_name: string;
  plugin_title: string | null;
};

export type IntegrationProvider = {
  plugin_group: string;
  provider_name: string;
  provider_docs_url: string | null;
  auth_type: string | null;
  is_internal: boolean;
  tasks: IntegrationTask[];
};

export type ServiceFunction = {
  function_id: string;
  function_name: string;
  function_type: string;
  label: string;
  description: string | null;
  tags: string[];
  beta: boolean;
  deprecated: boolean;
};

export type MarketplaceService = {
  service_id: string;
  service_type: string;
  service_type_label: string;
  service_name: string;
  description: string | null;
  docs_url: string | null;
  health_status: string;
  primary_stage: string | null;
  functions: ServiceFunction[];
};

export type CategoryOption = {
  value: string;
  label: string;
  count: number;
};