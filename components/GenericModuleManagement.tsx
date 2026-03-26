"use client";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { handleUnauthorizedClientResponse } from "@/lib/client-auth";
import { getCrudModuleConfig } from "@/lib/module-crud-config";
import PatrimonioEtiquetaCard from "./PatrimonioEtiquetaCard";
import SystemConfirmDialog from "./SystemConfirmDialog";
import SystemFeedbackStack from "./SystemFeedbackStack";
export type ModuleLookupConfig = {
  key: string;
  path: string;
  label: (item: Record<string, unknown>) => string;
};
export type ModuleFieldConfig = {
  name: string;
  label: string;
  type: "text" | "email" | "date" | "number" | "textarea" | "select";
  required?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
  valueType?: "string" | "number";
  defaultValue?: string | ((context: { empresaId: number | null }) => string);
  options?: Array<{ value: string; label: string }>;
  lookupKey?: string;
  filterOption?: (
    item: Record<string, unknown>,
    form: Record<string, string>,
    lookups: Record<string, Record<string, unknown>[]>,
  ) => boolean;
  clearOnChange?: string[];
  disabled?: (form: Record<string, string>) => boolean;
};
export type ModuleColumnConfig = {
  label: string;
  render: (
    item: Record<string, unknown>,
    context: {
      lookups: Record<string, Record<string, unknown>[]>;
      getLookupLabel: (lookupKey: string, id: unknown) => string;
    },
  ) => ReactNode;
};
export type ModuleStepConfig = {
  key: string;
  label: string;
  description?: string;
  fields: string[];
  compactSummary?: boolean;
  formGridClassName?: string;
};
export type ModuleConfig = {
  key: string;
  label: string;
  summary: string;
  endpoint: string;
  createLabel: string;
  allowCreate?: boolean;
  emptyMessage: string;
  modalMaxWidthClassName?: string;
  steppedBodyMinHeightClassName?: string;
  lookups?: ModuleLookupConfig[];
  fields: ModuleFieldConfig[];
  columns: ModuleColumnConfig[];
  steps?: ModuleStepConfig[];
};
type GenericModuleManagementProps = {
  empresaId: number | null;
  slug: string;
  empresaNome?: string | null;
  empresaLogoUrl?: string | null;
};
type ModalMode = "create" | "edit" | "view" | null;
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  action: () => Promise<void> | void;
};
type AssetPreviewState = {
  type: "image" | "document";
  url: string;
  name: string;
  mimeType?: string;
};
type PendingImageUpload = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
};
type PendingDocumentUpload = {
  id: string;
  file: File;
  name: string;
  tipoDocumento: string;
  previewUrl: string;
  mimeType: string;
};
const documentTypeOptions = [
  { value: "NF_E", label: "NF-e" },
  { value: "DANFE", label: "DANFE" },
  { value: "XML", label: "XML" },
  { value: "ORCAMENTO", label: "Orcamento" },
  { value: "GARANTIA", label: "Garantia" },
] as const;
function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      
      <path d="M1.5 12s3.9-6.5 10.5-6.5S22.5 12 22.5 12 18.6 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.3" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      
      <path d="m4 20 4.1-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.1 16 4 20Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      
      <path d="M4 7h16" />
      <path d="M9 7V4.8c0-.4.4-.8.8-.8h4.4c.4 0 .8.4.8.8V7" />
      <path d="M6.2 7 7 19.2c0 .5.4.8.8.8h8.4c.4 0 .8-.3.8-.8L17.8 7" />
      <path d="M10 11.2v4.6" /> <path d="M14 11.2v4.6" />
    </svg>
  );
}
function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      
      <path d="m12 3.8 2.5 5.1 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.6 1-5.7-4.1-4 5.7-.8L12 3.8Z" />
    </svg>
  );
}
function normalizeFieldValue(field: ModuleFieldConfig, rawValue: unknown) {
  if (rawValue === null || rawValue === undefined) {
    return "";
  }
  if (field.type === "select" || field.type === "number") {
    return String(rawValue);
  }
  return String(rawValue);
}
function getDefaultValue(field: ModuleFieldConfig, empresaId: number | null) {
  if (typeof field.defaultValue === "function") {
    return field.defaultValue({ empresaId });
  }
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  return "";
}
function getRecordImages(record: Record<string, unknown> | null) {
  if (!record || !Array.isArray(record.imagens)) {
    return [];
  }
  return record.imagens.filter(
    (imagem): imagem is Record<string, unknown> =>
      typeof imagem === "object" && imagem !== null,
  );
}
function getRecordDocuments(record: Record<string, unknown> | null) {
  if (!record || !Array.isArray(record.documentos)) {
    return [];
  }
  return record.documentos.filter(
    (documento): documento is Record<string, unknown> =>
      typeof documento === "object" && documento !== null,
  );
}
function formatFileSize(sizeInBytes: unknown) {
  const numericSize = Number(sizeInBytes ?? 0);
  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    return "0 KB";
  }
  if (numericSize >= 1024 * 1024) {
    return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(numericSize / 1024))} KB`;
}
function getDocumentPreviewUrl(url: string) {
  return `${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=100`;
}
function getDocumentTypeLabel(tipoDocumento: unknown) {
  return (
    documentTypeOptions.find(
      (option) => option.value === String(tipoDocumento ?? ""),
    )?.label ?? String(tipoDocumento ?? "Documento")
  );
}
function createPendingUploadId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function getPlaquetaPreviewItems(
  records: Record<string, unknown>[],
  empresaId: number | null,
  empresaNome?: string | null,
  empresaLogoUrl?: string | null,
) {
  if (records.length > 0) {
    return records.slice(0, 6).map((record, index) => {
      const empresa =
        typeof record.empresa === "object" && record.empresa !== null
          ? (record.empresa as Record<string, unknown>)
          : null;
      return {
        id: String(record.id ?? index),
        numeroPlaqueta: String(
          record.numero_plaqueta ?? record.codigo_plaqueta ?? `08${33 + index}`,
        ),
        barcodeValue: String(
          record.link_consulta ??
            record.codigo_barras_conteudo ??
            record.codigo_plaqueta ??
            `PAT-${empresaId ?? 1}-08${33 + index}`,
        ),
        empresaNome: String(
          record.empresa_nome ?? empresa?.nome_fantasia ?? "Empresa",
        ),
        logoSrc: String(record.empresa_logo_url ?? empresa?.logo_url ?? ""),
      };
    });
  }
  return ["0837", "0838", "0835", "0836", "0833", "0834"].map((numero) => ({
    id: numero,
    numeroPlaqueta: numero,
    barcodeValue: `PAT-${empresaId ?? 1}-${numero}`,
    empresaNome: empresaNome ?? "Sua empresa",
    logoSrc: empresaLogoUrl ?? null,
  }));
}
export default function GenericModuleManagement({
  empresaId,
  slug,
  empresaNome,
  empresaLogoUrl,
}: GenericModuleManagementProps) {
  const config = getCrudModuleConfig(slug);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [lookups, setLookups] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageTitle, setMessageTitle] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRecord, setSelectedRecord] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState("DANFE");
  const [documentTypeMenuOpen, setDocumentTypeMenuOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImageUpload[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<
    PendingDocumentUpload[]
  >([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  );
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [assetPreview, setAssetPreview] = useState<AssetPreviewState | null>(
    null,
  );
  const isReadOnly = modalMode === "view";
  const isPlaquetasModule = config.key === "plaquetas";
  const plaquetaPreviewItems = useMemo(
    () =>
      getPlaquetaPreviewItems(records, empresaId, empresaNome, empresaLogoUrl),
    [empresaId, empresaLogoUrl, empresaNome, records],
  );
  useEffect(() => {
    if (!modalMode) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalMode]);
  useEffect(() => {
    if (!config) {
      return;
    }
    void refreshAll();
  }, [slug]);
  if (!config) {
    return null;
  }
  const modalSteps = useMemo(() => config.steps ?? [], [config.steps]);
  const hasSteps = modalSteps.length > 0;
  const currentStep = hasSteps
    ? (modalSteps[activeStepIndex] ?? modalSteps[0])
    : null;
  const useInlineSummary = currentStep?.compactSummary ?? false;
  const stepFormGridClassName =
    currentStep?.formGridClassName ?? "md:grid-cols-2";
  const steppedBodyMinHeightClassName =
    config.steppedBodyMinHeightClassName ?? "min-h-[420px] lg:min-h-[448px]";
  const isAssetModule = config.key === "bens";
  const isAssetAttachmentsStep = isAssetModule && currentStep?.key === "anexos";
  const selectedImages = getRecordImages(selectedRecord);
  const selectedDocuments = getRecordDocuments(selectedRecord);
  const visibleImages = selectedImages.slice(0, 5);
  const totalImageCount = selectedImages.length + pendingImages.length;
  const imageInputId = `asset-images-${selectedRecord?.id ?? "novo"}`;
  const documentInputId = `asset-documents-${selectedRecord?.id ?? "novo"}`;
  const visibleFields = useMemo(() => {
    const baseFields = config.fields.filter((field) => !field.hidden);
    if (!currentStep) {
      return baseFields;
    }
    const currentFieldNames = new Set(currentStep.fields);
    return baseFields.filter((field) => currentFieldNames.has(field.name));
  }, [config.fields, currentStep]);
  async function refreshAll() {
    await Promise.all([loadRecords(), loadLookups()]);
  }
  async function loadRecords() {
    setLoading(true);
    setError(null);
    setErrorTitle(null);
    try {
      const response = await fetch(`/api/admin/${config.endpoint}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: Record<string, unknown>[];
        message?: string;
      } | null;
      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }
      if (!response.ok) {
        throw new Error(
          payload?.message ??
            `Falha ao consultar ${config.label.toLowerCase()}: ${response.status}`,
        );
      }
      setRecords(payload?.data ?? []);
    } catch (fetchError) {
      setErrorTitle("Falha na consulta");
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : `Não foi possível consultar ${config.label.toLowerCase()}.`,
      );
    } finally {
      setLoading(false);
    }
  }
  async function loadLookups() {
    if (!config.lookups?.length) {
      return;
    }
    try {
      const entries = await Promise.all(
        config.lookups.map(async (lookup) => {
          const response = await fetch(`/api/admin/${lookup.path}`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          const payload = (await response.json().catch(() => null)) as {
            data?: Record<string, unknown>[];
          } | null;
          if (handleUnauthorizedClientResponse(response.status)) {
            return [lookup.key, []] as const;
          }
          if (!response.ok) {
            return [lookup.key, []] as const;
          }
          return [lookup.key, payload?.data ?? []] as const;
        }),
      );
      setLookups(Object.fromEntries(entries));
    } catch {
      setLookups((current) => current);
    }
  }
  function getLookupLabel(lookupKey: string, id: unknown) {
    const lookup = config.lookups?.find((entry) => entry.key === lookupKey);
    const item = lookups[lookupKey]?.find(
      (entry) => String(entry.id ?? "") === String(id ?? ""),
    );
    if (!lookup || !item) {
      return typeof id === "number" || typeof id === "string"
        ? `#${id}`
        : "Não informado";
    }
    return lookup.label(item);
  }
  function createInitialForm(record?: Record<string, unknown> | null) {
    return Object.fromEntries(
      config.fields.map((field) => [
        field.name,
        record
          ? normalizeFieldValue(field, record[field.name])
          : getDefaultValue(field, empresaId),
      ]),
    ) as Record<string, string>;
  }
  function resetModal() {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    pendingDocuments.forEach((document) =>
      URL.revokeObjectURL(document.previewUrl),
    );
    setModalMode(null);
    setSelectedRecord(null);
    setForm(createInitialForm(null));
    setActiveStepIndex(0);
    setUploadingImages(false);
    setUploadingDocuments(false);
    setUploadDocumentType("DANFE");
    setDocumentTypeMenuOpen(false);
    setPendingImages([]);
    setPendingDocuments([]);
  }
  function openCreateModal() {
    setError(null);
    setSelectedRecord(null);
    setForm(createInitialForm(null));
    setActiveStepIndex(0);
    setModalMode("create");
  }
  function openViewModal(record: Record<string, unknown>) {
    setError(null);
    setSelectedRecord(record);
    setForm(createInitialForm(record));
    setActiveStepIndex(0);
    setModalMode("view");
  }
  function openEditModal(record: Record<string, unknown>) {
    setError(null);
    setSelectedRecord(record);
    setForm(createInitialForm(record));
    setActiveStepIndex(0);
    setModalMode("edit");
  }
  function updateField(field: ModuleFieldConfig, value: string) {
    setForm((current) => {
      const next = { ...current, [field.name]: value };
      field.clearOnChange?.forEach((clearField) => {
        next[clearField] = "";
      });
      return next;
    });
  }
  function buildPayload() {
    return Object.fromEntries(
      config.fields.map((field) => {
        const rawValue = form[field.name];
        if (field.valueType === "number") {
          if (rawValue === "") {
            return [field.name, null];
          }
          return [field.name, Number(rawValue)];
        }
        if (field.type === "number") {
          if (rawValue === "") {
            return [field.name, null];
          }
          return [
            field.name,
            rawValue.includes(".") ? Number(rawValue) : Number(rawValue),
          ];
        }
        return [field.name, rawValue === "" ? null : rawValue];
      }),
    );
  }
  async function handleSubmit(options?: { closeAfterSave?: boolean }) {
    const closeAfterSave = options?.closeAfterSave ?? true;
    const endpoint =
      modalMode === "edit" && selectedRecord
        ? `/api/admin/${config.endpoint}/${selectedRecord.id}`
        : `/api/admin/${config.endpoint}`;
    const method = modalMode === "edit" ? "PUT" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload()),
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: Record<string, unknown>;
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      return null;
    }
    if (!response.ok || !payload?.data) {
      const firstError = payload?.errors
        ? Object.values(payload.errors).flat().find(Boolean)
        : null;
      setErrorTitle("Falha ao salvar");
      setError(
        firstError ??
          payload?.message ??
          `Não foi possível salvar ${config.label.toLowerCase()}.`,
      );
      return null;
    }
    setMessageTitle(
      modalMode === "edit" ? "Alteracao salva" : "Cadastro concluido",
    );
    setMessage(
      modalMode === "edit"
        ? `${config.label} atualizado com sucesso.`
        : `${config.label} cadastrado com sucesso.`,
    );
    if (!closeAfterSave) {
      setSelectedRecord(payload.data);
      setForm(createInitialForm(payload.data));
      if (modalMode === "create") {
        setModalMode("edit");
      }
      await loadRecords();
      return payload.data;
    }
    resetModal();
    await loadRecords();
    return payload.data;
  }
  function goToPreviousStep() {
    setActiveStepIndex((current) => Math.max(current - 1, 0));
  }
  function goToNextStep() {
    setActiveStepIndex((current) =>
      Math.min(current + 1, modalSteps.length - 1),
    );
  }
  async function handlePrimaryAction() {
    if (hasSteps && activeStepIndex < modalSteps.length - 1) {
      goToNextStep();
      return;
    }
    if (!isReadOnly && isAssetAttachmentsStep) {
      const savedRecord = await handleSubmit({ closeAfterSave: false });
      if (!savedRecord?.id) {
        return;
      }
      const uploadsOk = await flushPendingUploads(Number(savedRecord.id));
      if (!uploadsOk) {
        return;
      }
      resetModal();
      await loadRecords();
      return;
    }
    if (isReadOnly) {
      resetModal();
      return;
    }
    await handleSubmit();
  }
  async function handleDelete(record: Record<string, unknown>) {
    setConfirmDialog({
      title: `Excluir ${config.label.toLowerCase()}`,
      description:
        "Essa acao remove o registro selecionado do sistema. Deseja continuar?",
      confirmLabel: "Excluir",
      tone: "danger",
      action: async () => {
        const response = await fetch(
          `/api/admin/${config.endpoint}/${record.id}`,
          { method: "DELETE", headers: { Accept: "application/json" } },
        );
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        if (
          handleUnauthorizedClientResponse(response.status, payload?.message)
        ) {
          return;
        }
        if (!response.ok) {
          setErrorTitle("Falha na exclusao");
          setError(
            payload?.message ??
              `Não foi possível excluir ${config.label.toLowerCase()}.`,
          );
          return;
        }
        setMessageTitle("Registro removido");
        setMessage(payload?.message ?? `${config.label} removido com sucesso.`);
        await loadRecords();
      },
    });
  }
  async function refreshSelectedRecord() {
    if (!selectedRecord?.id) {
      return;
    }
    const response = await fetch(
      `/api/admin/${config.endpoint}/${selectedRecord.id}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    const payload = (await response.json().catch(() => null)) as {
      data?: Record<string, unknown>;
      message?: string;
    } | null;
    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      throw new Error("Sessão expirada.");
    }
    if (!response.ok || !payload?.data) {
      throw new Error(
        payload?.message ??
          `Não foi possível atualizar ${config.label.toLowerCase()}.`,
      );
    }
    const refreshedRecord = payload.data;
    setSelectedRecord(refreshedRecord);
    setRecords((current) =>
      current.map((item) =>
        String(item.id) === String(refreshedRecord.id) ? refreshedRecord : item,
      ),
    );
  }
  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }
    setError(null);
    setErrorTitle(null);
    if (!selectedRecord?.id) {
      const remainingSlots = Math.max(0, 5 - totalImageCount);
      if (remainingSlots === 0) {
        setErrorTitle("Limite de imagens");
        setError("Este bem permite no máximo 5 imagens.");
        event.target.value = "";
        return;
      }
      const queuedFiles = Array.from(files)
        .slice(0, remainingSlots)
        .map((file) => ({
          id: createPendingUploadId("pending-image"),
          file,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
        }));
      setPendingImages((current) => [...current, ...queuedFiles]);
      setMessageTitle("Upload de imagens");
      setMessage(
        queuedFiles.length === 1
          ? "1 imagem preparada para envio."
          : `${queuedFiles.length} imagens preparadas para envio.`,
      );
      event.target.value = "";
      return;
    }
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("imagens[]", file);
    });
    setUploadingImages(true);
    try {
      const response = await fetch(
        `/api/admin/${config.endpoint}/${selectedRecord.id}/imagens`,
        { method: "POST", body: formData },
      );
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Não foi possível enviar as imagens do bem.",
        );
      }
      setMessageTitle("Upload de imagens");
      setMessage(payload?.message ?? "Imagens enviadas com sucesso.");
      await refreshSelectedRecord();
    } catch (uploadError) {
      setErrorTitle("Falha no upload de imagens");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar as imagens do bem.",
      );
    } finally {
      event.target.value = "";
      setUploadingImages(false);
    }
  }
  async function handleDocumentUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }
    setError(null);
    setErrorTitle(null);
    if (!selectedRecord?.id) {
      const queuedFiles = Array.from(files).map((file) => ({
        id: createPendingUploadId("pending-document"),
        file,
        name: file.name,
        tipoDocumento: uploadDocumentType,
        previewUrl: URL.createObjectURL(file),
        mimeType: file.type,
      }));
      setPendingDocuments((current) => [...current, ...queuedFiles]);
      setMessageTitle("Upload de Nota Fiscal");
      setMessage(
        queuedFiles.length === 1
          ? "1 documento preparado para envio."
          : `${queuedFiles.length} documentos preparados para envio.`,
      );
      event.target.value = "";
      return;
    }
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("documentos[]", file);
    });
    formData.append("tipo_documento", uploadDocumentType);
    setUploadingDocuments(true);
    try {
      const response = await fetch(
        `/api/admin/${config.endpoint}/${selectedRecord.id}/documentos`,
        { method: "POST", body: formData },
      );
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Não foi possível enviar os documentos do bem.",
        );
      }
      setMessageTitle("Upload de Nota Fiscal");
      setMessage(payload?.message ?? "Documentos enviados com sucesso.");
      await refreshSelectedRecord();
    } catch (uploadError) {
      setErrorTitle("Falha no upload da Nota Fiscal");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar os documentos do bem.",
      );
    } finally {
      event.target.value = "";
      setUploadingDocuments(false);
    }
  }
  async function handleImageDelete(imageId: unknown) {
    if (!imageId) {
      return;
    }
    if (!selectedRecord?.id) {
      setPendingImages((current) => {
        const target = current.find((image) => image.id === String(imageId));
        if (target) {
          URL.revokeObjectURL(target.previewUrl);
        }
        return current.filter((image) => image.id !== String(imageId));
      });
      setMessageTitle("Imagem removida");
      setMessage("Imagem removida da fila de envio.");
      return;
    }
    setConfirmDialog({
      title: "Remover imagem",
      description:
        "A imagem sera desvinculada do patrimonio e removida do armazenamento. Deseja continuar?",
      confirmLabel: "Remover",
      tone: "danger",
      action: async () => {
        setError(null);
        setErrorTitle(null);
        try {
          const response = await fetch(
            `/api/admin/${config.endpoint}/${selectedRecord.id}/imagens/${imageId}`,
            { method: "DELETE", headers: { Accept: "application/json" } },
          );
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          if (
            handleUnauthorizedClientResponse(response.status, payload?.message)
          ) {
            return;
          }
          if (!response.ok) {
            throw new Error(
              payload?.message ?? "Não foi possível remover a imagem do bem.",
            );
          }
          setMessageTitle("Imagem removida");
          setMessage(payload?.message ?? "Imagem removida com sucesso.");
          await refreshSelectedRecord();
        } catch (deleteError) {
          setErrorTitle("Falha ao remover imagem");
          setError(
            deleteError instanceof Error
              ? deleteError.message
              : "Não foi possível remover a imagem do bem.",
          );
        }
      },
    });
  }
  async function handleDocumentDelete(documentId: unknown) {
    if (!documentId) {
      return;
    }
    if (!selectedRecord?.id) {
      setPendingDocuments((current) => {
        const target = current.find(
          (document) => document.id === String(documentId),
        );
        if (target) {
          URL.revokeObjectURL(target.previewUrl);
        }
        return current.filter((document) => document.id !== String(documentId));
      });
      setMessageTitle("Nota Fiscal removida");
      setMessage("Documento removido da fila de envio.");
      return;
    }
    setConfirmDialog({
      title: "Remover documento fiscal",
      description:
        "O arquivo da Nota Fiscal sera removido do patrimonio. Deseja continuar?",
      confirmLabel: "Remover",
      tone: "danger",
      action: async () => {
        setError(null);
        setErrorTitle(null);
        try {
          const response = await fetch(
            `/api/admin/${config.endpoint}/${selectedRecord.id}/documentos/${documentId}`,
            { method: "DELETE", headers: { Accept: "application/json" } },
          );
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          if (
            handleUnauthorizedClientResponse(response.status, payload?.message)
          ) {
            return;
          }
          if (!response.ok) {
            throw new Error(
              payload?.message ??
                "Não foi possível remover o documento do bem.",
            );
          }
          setMessageTitle("Nota Fiscal removida");
          setMessage(payload?.message ?? "Documento removido com sucesso.");
          await refreshSelectedRecord();
        } catch (deleteError) {
          setErrorTitle("Falha ao remover Nota Fiscal");
          setError(
            deleteError instanceof Error
              ? deleteError.message
              : "Não foi possível remover o documento do bem.",
          );
        }
      },
    });
  }
  async function handleConfirmAction() {
    if (!confirmDialog) {
      return;
    }
    setConfirmBusy(true);
    try {
      await confirmDialog.action();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  }
  function openAssetPreview(preview: AssetPreviewState) {
    setAssetPreview(preview);
  }
  function closeAssetPreview() {
    setAssetPreview(null);
  }
  function handleDocumentTypeSelect(tipoDocumento: string) {
    setUploadDocumentType(tipoDocumento);
    setDocumentTypeMenuOpen(false);
    setTimeout(() => {
      const input = document.getElementById(
        documentInputId,
      ) as HTMLInputElement | null;
      input?.click();
    }, 0);
  }
  function canRenderDocumentInline(preview: AssetPreviewState | null) {
    if (!preview || preview.type !== "document") {
      return false;
    }
    const mimeType = String(preview.mimeType ?? "").toLowerCase();
    const url = preview.url.toLowerCase();
    return (
      mimeType.includes("pdf") ||
      mimeType.includes("xml") ||
      url.endsWith(".pdf") ||
      url.endsWith(".xml")
    );
  }
  async function handleSetPrincipalImage(imageId: unknown) {
    if (!selectedRecord?.id || !imageId) {
      return;
    }
    setError(null);
    setErrorTitle(null);
    try {
      const response = await fetch(
        `/api/admin/${config.endpoint}/${selectedRecord.id}/imagens/${imageId}/principal`,
        { method: "PATCH", headers: { Accept: "application/json" } },
      );
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Não foi possível definir a imagem principal.",
        );
      }
      setMessageTitle("Imagem principal definida");
      setMessage(payload?.message ?? "Imagem principal definida com sucesso.");
      await refreshSelectedRecord();
    } catch (principalError) {
      setErrorTitle("Falha ao definir imagem principal");
      setError(
        principalError instanceof Error
          ? principalError.message
          : "Não foi possível definir a imagem principal.",
      );
    }
  }
  async function handleMoveImage(
    imageId: unknown,
    direction: "previous" | "next",
  ) {
    if (!selectedRecord?.id || !imageId) {
      return;
    }
    const ids = selectedImages.map((imagem) => Number(imagem.id));
    const currentIndex = ids.findIndex((id) => id === Number(imageId));
    if (currentIndex === -1) {
      return;
    }
    const targetIndex =
      direction === "previous" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ids.length) {
      return;
    }
    const nextIds = [...ids];
    [nextIds[currentIndex], nextIds[targetIndex]] = [
      nextIds[targetIndex],
      nextIds[currentIndex],
    ];
    setError(null);
    setErrorTitle(null);
    try {
      const response = await fetch(
        `/api/admin/${config.endpoint}/${selectedRecord.id}/imagens/ordenacao`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imagens: nextIds }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Não foi possível reordenar as imagens.",
        );
      }
      setMessageTitle("Ordem das imagens");
      setMessage(
        payload?.message ?? "Ordem das imagens atualizada com sucesso.",
      );
      await refreshSelectedRecord();
    } catch (reorderError) {
      setErrorTitle("Falha ao reordenar imagens");
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Não foi possível reordenar as imagens.",
      );
    }
  }
  async function handleDocumentTypeChange(
    documentId: unknown,
    tipoDocumento: string,
  ) {
    if (!documentId) {
      return;
    }
    if (!selectedRecord?.id) {
      setPendingDocuments((current) =>
        current.map((document) =>
          document.id === String(documentId)
            ? { ...document, tipoDocumento }
            : document,
        ),
      );
      return;
    }
    setError(null);
    setErrorTitle(null);
    try {
      const response = await fetch(
        `/api/admin/${config.endpoint}/${selectedRecord.id}/documentos/${documentId}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tipo_documento: tipoDocumento }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Não foi possível atualizar o tipo do documento.",
        );
      }
      setMessageTitle("Tipo do documento");
      setMessage(
        payload?.message ?? "Tipo do documento atualizado com sucesso.",
      );
      await refreshSelectedRecord();
    } catch (documentTypeError) {
      setErrorTitle("Falha ao atualizar tipo do documento");
      setError(
        documentTypeError instanceof Error
          ? documentTypeError.message
          : "Não foi possível atualizar o tipo do documento.",
      );
    }
  }
  async function flushPendingUploads(recordId: number) {
    if (!pendingImages.length && !pendingDocuments.length) {
      return true;
    }
    try {
      if (pendingImages.length) {
        setUploadingImages(true);
        const imageFormData = new FormData();
        pendingImages.forEach((image) => {
          imageFormData.append("imagens[]", image.file);
        });
        const imageResponse = await fetch(
          `/api/admin/${config.endpoint}/${recordId}/imagens`,
          { method: "POST", body: imageFormData },
        );
        const imagePayload = (await imageResponse.json().catch(() => null)) as {
          message?: string;
        } | null;
        if (
          handleUnauthorizedClientResponse(
            imageResponse.status,
            imagePayload?.message,
          )
        ) {
          return false;
        }
        if (!imageResponse.ok) {
          throw new Error(
            imagePayload?.message ??
              "Não foi possível enviar as imagens do bem.",
          );
        }
      }
      if (pendingDocuments.length) {
        setUploadingDocuments(true);
        for (const document of pendingDocuments) {
          const documentFormData = new FormData();
          documentFormData.append("documentos[]", document.file);
          documentFormData.append("tipo_documento", document.tipoDocumento);
          const documentResponse = await fetch(
            `/api/admin/${config.endpoint}/${recordId}/documentos`,
            { method: "POST", body: documentFormData },
          );
          const documentPayload = (await documentResponse
            .json()
            .catch(() => null)) as { message?: string } | null;
          if (
            handleUnauthorizedClientResponse(
              documentResponse.status,
              documentPayload?.message,
            )
          ) {
            return false;
          }
          if (!documentResponse.ok) {
            throw new Error(
              documentPayload?.message ??
                "Não foi possível enviar os documentos do bem.",
            );
          }
        }
      }
      pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      pendingDocuments.forEach((document) =>
        URL.revokeObjectURL(document.previewUrl),
      );
      setPendingImages([]);
      setPendingDocuments([]);
      setMessageTitle("Anexos enviados");
      setMessage("Imagens e documentos vinculados ao bem com sucesso.");
      return true;
    } catch (uploadError) {
      setErrorTitle("Falha no envio dos anexos");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível concluir o envio dos anexos.",
      );
      return false;
    } finally {
      setUploadingImages(false);
      setUploadingDocuments(false);
    }
  }
  return (
    <>
      
      <SystemFeedbackStack
        error={error}
        message={message}
        errorTitle={errorTitle}
        messageTitle={messageTitle}
        onCloseError={() => {
          setError(null);
          setErrorTitle(null);
        }}
        onCloseMessage={() => {
          setMessage(null);
          setMessageTitle(null);
        }}
      />
      <section className="panel-surface rounded-[28px] p-5 md:p-6">
        
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          
          <div>
            
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              {config.label}
            </p>
            <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">
              {config.summary}
            </h2>
            <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
              
              Tela operacional vinculada a tabela real do sistema, respeitando a
              empresa ativa e a estrutura multiempresa.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {config.allowCreate !== false ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4.5 text-[13px] font-semibold text-white transition hover:opacity-90"
              >
                {config.createLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4.5 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              
              Atualizar
            </button>
          </div>
        </div>
        {isPlaquetasModule ? (
          <section className="mt-6 rounded-[24px] border border-[var(--line)] bg-[#fafafa] p-4 md:p-5">
            
            <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
              
              <div>
                
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Modelo da etiqueta patrimonial
                </p>
                <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">
                  
                  Layout da plaqueta no padrão físico de patrimônio, com número
                  visível e código de barras para leitura.
                </p>
              </div>
              <p className="text-[12px] font-medium text-[var(--muted)]">
                A leitura pode abrir a consulta pública do item no celular.
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              
              {plaquetaPreviewItems.map((item) => (
                <PatrimonioEtiquetaCard
                  key={item.id}
                  numeroPlaqueta={item.numeroPlaqueta}
                  barcodeValue={item.barcodeValue}
                  empresaNome={item.empresaNome}
                  logoSrc={item.logoSrc}
                  className="h-[104px] w-full max-w-[290px] shadow-none"
                />
              ))}
            </div>
          </section>
        ) : null}
        <div className="mt-6 overflow-hidden rounded-[24px] border border-[var(--line)]">
          
          <div className="overflow-x-auto">
            
            <table className="min-w-full border-collapse">
              
              <thead>
                
                <tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  
                  {config.columns.map((column) => (
                    <th key={column.label} className="px-4 py-3.5">
                      
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                
                {loading ? (
                  <tr>
                    
                    <td
                      colSpan={config.columns.length + 1}
                      className="px-4 py-8 text-center text-sm text-[var(--muted)]"
                    >
                      
                      Carregando dados...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    
                    <td
                      colSpan={config.columns.length + 1}
                      className="px-4 py-8 text-center text-sm text-[var(--muted)]"
                    >
                      
                      {config.emptyMessage}
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr
                      key={String(record.id)}
                      className="border-t border-[var(--line)] text-[13px] text-[var(--ink)]"
                    >
                      
                      {config.columns.map((column) => (
                        <td
                          key={column.label}
                          className="px-4 py-3.5 align-top"
                        >
                          
                          {column.render(record, {
                            lookups,
                            getLookupLabel,
                          })}
                        </td>
                      ))}
                      <td className="px-4 py-3.5">
                        
                        <div className="flex items-center justify-end gap-2">
                          
                          <button
                            type="button"
                            onClick={() => openViewModal(record)}
                            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            aria-label={`Visualizar ${config.label.toLowerCase()}`}
                            title="Visualizar"
                          >
                            
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            aria-label={`Editar ${config.label.toLowerCase()}`}
                            title="Editar"
                          >
                            
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(record)}
                            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[rgba(190,18,60,0.15)] bg-white text-[var(--rose)] transition hover:border-[rgba(190,18,60,0.35)] hover:bg-[rgba(190,18,60,0.06)]"
                            aria-label={`Excluir ${config.label.toLowerCase()}`}
                            title="Excluir"
                          >
                            
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {modalMode ? (
        <div className="admin-modal-overlay">
          
          <div
            className={`panel-surface admin-modal-shell ${config.modalMaxWidthClassName ?? "admin-modal-shell--lg"} rounded-[24px] p-3 md:p-3.5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]`}
          >
            
            <div className="flex flex-col gap-2.5 border-b border-[var(--line)] pb-2.5 sm:flex-row sm:items-start sm:justify-between">
              
              <div>
                
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {config.label}
                </p>
                <h3 className="mt-1 text-[1.16rem] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[1.28rem]">
                  
                  {modalMode === "create"
                    ? config.createLabel
                    : modalMode === "edit"
                      ? `Editar ${config.label.toLowerCase()}`
                      : `Visualizar ${config.label.toLowerCase()}`}
                </h3>
                <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[var(--muted)]">
                  
                  Formulario conectado diretamente ao endpoint `
                  {config.endpoint}` da API REST do NWB Asset.
                </p>
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="inline-flex h-9 items-center justify-center self-start rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                
                Fechar
              </button>
            </div>
            <div className="admin-modal-content mt-2.5 pr-1">
              
              {hasSteps ? (
                <div className="rounded-[18px] border border-[var(--line)] bg-[#fafafa] p-2.5 md:p-3">
                  
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                    
                    <div>
                      
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        Timeline do cadastro
                      </p>
                      <p className="mt-0.5 text-[12px] leading-4.5 text-[var(--muted)]">
                        
                        {currentStep?.description ??
                          "Cadastro dividido em etapas para facilitar a leitura."}
                      </p>
                    </div>
                    <p className="text-[13px] font-semibold text-[var(--ink)]">
                      
                      Etapa {activeStepIndex + 1} de {modalSteps.length}
                    </p>
                  </div>
                  <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                    
                    {modalSteps.map((step, index) => {
                      const isActive = index === activeStepIndex;
                      const isCompleted = index < activeStepIndex;
                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => setActiveStepIndex(index)}
                          className={`flex min-w-[142px] flex-1 items-center gap-2.5 rounded-[16px] border px-2.5 py-2 text-left transition md:min-w-0 ${isActive ? "border-[var(--blue)] bg-[rgba(37,99,235,0.08)]" : isCompleted ? "border-[rgba(34,197,94,0.18)] bg-[rgba(74,222,128,0.08)]" : "border-[var(--line)] bg-white hover:border-[var(--blue)]"}`}
                        >
                          
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${isActive ? "bg-[var(--blue)] text-white" : isCompleted ? "bg-[var(--mint-deep)] text-white" : "bg-[#eef2f7] text-[var(--muted)]"}`}
                          >
                            
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            
                            <span className="block text-[13px] font-semibold leading-4 text-[var(--ink)]">
                              {step.label}
                            </span>
                            {step.description ? (
                              <span className="mt-0.5 hidden text-[10px] leading-3.5 text-[var(--muted)] xl:block">
                                {step.description}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div
                className={`mt-2.5 grid gap-3 ${hasSteps ? steppedBodyMinHeightClassName : ""}`}
              >
                
                <div className="grid gap-3">
                  
                  <div className="h-full rounded-[18px] border border-[var(--line)] bg-[#fafafa] p-3">
                    
                    {isAssetAttachmentsStep ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        
                        <section className="rounded-[18px] border border-[var(--line)] bg-white p-3.5">
                          
                          <div className="flex items-start justify-between gap-3">
                            
                            <div>
                              
                              <div className="flex items-center gap-2">
                                
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                                  Imagens do patrimonio
                                </p>
                                {isAssetModule ? (
                                  <span className="rounded-full bg-[rgba(37,99,235,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">
                                    
                                    {totalImageCount}/5
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                                
                                Até 5 fotos do bem. Os arquivos selecionados
                                serao enviados ao concluir.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              
                              <input
                                id={imageInputId}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                multiple
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={
                                  uploadingImages || totalImageCount >= 5
                                }
                              />
                              <label
                                htmlFor={imageInputId}
                                className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold transition ${uploadingImages || totalImageCount >= 5 ? "bg-[#dbe3f1] text-[var(--muted)]" : "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}
                              >
                                
                                {uploadingImages
                                  ? "Enviando..."
                                  : "Adicionar"}
                              </label>
                            </div>
                          </div>
                          <div className="mt-2.5">
                            
                            {selectedImages.length > 0 ||
                            pendingImages.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                                
                                {selectedImages.map((imagem, index) => (
                                  <div
                                    key={String(
                                      imagem.id ??
                                        imagem.url ??
                                        `${selectedRecord?.id}-img-${index}`,
                                    )}
                                    className="group overflow-hidden rounded-[16px] border border-[var(--line)] bg-[#fafafa] cursor-pointer"
                                    onClick={() =>
                                      openAssetPreview({
                                        type: "image",
                                        url: String(imagem.url ?? ""),
                                        name: String(
                                          imagem.nome_original ??
                                            "Imagem do patrimonio",
                                        ),
                                        mimeType: String(
                                          imagem.mime_type ?? "",
                                        ),
                                      })
                                    }
                                    title="Visualizar imagem"
                                  >
                                    
                                    <div className="relative aspect-square bg-[#eef2f7]">
                                      
                                      <div className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1">
                                        
                                        {Boolean(imagem.principal) ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(250,204,21,0.92)] px-2 py-1 text-[10px] font-semibold text-[#6b4e00] shadow-sm">
                                            
                                            <StarIcon filled /> Principal
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              void handleSetPrincipalImage(
                                                imagem.id,
                                              );
                                            }}
                                            className="inline-flex h-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.94)] px-2 text-[10px] font-semibold text-[var(--blue)] shadow-sm transition hover:bg-white"
                                            title="Definir como principal"
                                          >
                                            
                                            <StarIcon />
                                          </button>
                                        )}
                                      </div>
                                      <img
                                        src={String(imagem.url ?? "")}
                                        alt={String(
                                          imagem.nome_original ??
                                            "Imagem do patrimonio",
                                        )}
                                        className="h-full w-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void handleImageDelete(imagem.id);
                                        }}
                                        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.94)] text-[var(--rose)] shadow-sm transition hover:bg-white"
                                        aria-label="Remover imagem"
                                        title="Remover imagem"
                                      >
                                        
                                        <TrashIcon />
                                      </button>
                                    </div>
                                    <div className="px-2.5 py-2">
                                      
                                      <p className="truncate text-[11px] font-medium text-[var(--ink)]">
                                        {String(
                                          imagem.nome_original ?? "Imagem",
                                        )}
                                      </p>
                                      <div className="mt-1 flex items-center justify-between gap-2">
                                        
                                        <p className="text-[10px] text-[var(--muted)]">
                                          Clique para visualizar
                                        </p>
                                        <div className="flex items-center gap-1">
                                          
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              void handleMoveImage(
                                                imagem.id,
                                                "previous",
                                              );
                                            }}
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
                                            title="Mover para a esquerda"
                                          >
                                            
                                            <span className="text-xs leading-none">
                                              ←
                                            </span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              void handleMoveImage(
                                                imagem.id,
                                                "next",
                                              );
                                            }}
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
                                            title="Mover para a direita"
                                          >
                                            
                                            <span className="text-xs leading-none">
                                              →
                                            </span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {pendingImages.map((imagem) => (
                                  <div
                                    key={imagem.id}
                                    className="group overflow-hidden rounded-[16px] border border-dashed border-[rgba(37,99,235,0.22)] bg-[#fafafa] cursor-pointer"
                                    onClick={() =>
                                      openAssetPreview({
                                        type: "image",
                                        url: imagem.previewUrl,
                                        name: imagem.name,
                                        mimeType: imagem.file.type,
                                      })
                                    }
                                    title="Visualizar imagem"
                                  >
                                    
                                    <div className="relative aspect-square bg-[#eef2f7]">
                                      
                                      <div className="absolute left-1.5 top-1.5 z-10">
                                        
                                        <span className="inline-flex items-center rounded-full bg-[rgba(37,99,235,0.92)] px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                                          
                                          Pendente
                                        </span>
                                      </div>
                                      <img
                                        src={imagem.previewUrl}
                                        alt={imagem.name}
                                        className="h-full w-full object-cover opacity-95"
                                      />
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void handleImageDelete(imagem.id);
                                        }}
                                        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.94)] text-[var(--rose)] shadow-sm transition hover:bg-white"
                                        aria-label="Remover imagem"
                                        title="Remover imagem"
                                      >
                                        
                                        <TrashIcon />
                                      </button>
                                    </div>
                                    <div className="px-2.5 py-2">
                                      
                                      <p className="truncate text-[11px] font-medium text-[var(--ink)]">
                                        {imagem.name}
                                      </p>
                                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                                        Aguardando conclusao do cadastro
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-[#fafafa] px-4 py-5 text-sm text-[var(--muted)]">
                                
                                Nenhuma imagem selecionada.
                              </div>
                            )}
                          </div>
                        </section>
                        <section className="rounded-[18px] border border-[var(--line)] bg-white p-3.5">
                          
                          <div className="flex items-start justify-between gap-3">
                            
                            <div>
                              
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                                Nota Fiscal
                              </p>
                              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                                
                                PDF ou XML vinculados ao bem.
                              </p>
                            </div>
                            <div className="relative">
                              
                              <input
                                id={documentInputId}
                                type="file"
                                accept=".pdf,.xml,application/pdf,text/xml,application/xml"
                                multiple
                                className="hidden"
                                onChange={handleDocumentUpload}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setDocumentTypeMenuOpen((current) => !current)
                                }
                                className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition ${uploadingDocuments ? "bg-[#dbe3f1] text-[var(--muted)]" : "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}
                                disabled={uploadingDocuments}
                              >
                                
                                {uploadingDocuments
                                  ? "Enviando..."
                                  : `Anexar ${getDocumentTypeLabel(uploadDocumentType)}`}
                              </button>
                              {documentTypeMenuOpen && !uploadingDocuments ? (
                                <div className="absolute right-0 top-11 z-20 min-w-[170px] overflow-hidden rounded-[16px] border border-[var(--line)] bg-white p-1 shadow-[0_14px_36px_rgba(15,23,42,0.12)]">
                                  
                                  {documentTypeOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() =>
                                        handleDocumentTypeSelect(option.value)
                                      }
                                      className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-[12px] font-medium transition ${uploadDocumentType === option.value ? "bg-[rgba(37,99,235,0.08)] text-[var(--blue)]" : "text-[var(--ink)] hover:bg-[#f8fafc]"}`}
                                    >
                                      
                                      <span>{option.label}</span>
                                      {uploadDocumentType === option.value ? (
                                        <span className="text-[10px] font-semibold">
                                          Atual
                                        </span>
                                      ) : null}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2.5">
                            
                            {selectedDocuments.length > 0 ||
                            pendingDocuments.length > 0 ? (
                              <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                                
                                {selectedDocuments.map((documento, index) => (
                                  <div
                                    key={String(
                                      documento.id ??
                                        documento.url ??
                                        `${selectedRecord?.id}-doc-${index}`,
                                    )}
                                    className="group overflow-hidden rounded-[16px] border border-[var(--line)] bg-[#fafafa] cursor-pointer"
                                    onClick={() =>
                                      openAssetPreview({
                                        type: "document",
                                        url: String(documento.url ?? ""),
                                        name: String(
                                          documento.nome_original ??
                                            "Documento fiscal",
                                        ),
                                        mimeType: String(
                                          documento.mime_type ?? "",
                                        ),
                                      })
                                    }
                                    title="Visualizar documento"
                                  >
                                    
                                    <div className="relative aspect-[4/3] overflow-hidden bg-[#eef2f7]">
                                      
                                      {String(
                                        documento.mime_type ?? "",
                                      ).includes("xml") ? (
                                        <div className="flex h-full flex-col items-start justify-between bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4">
                                          
                                          <span className="rounded-full bg-[rgba(37,99,235,0.12)] px-2.5 py-1 text-[10px] font-semibold text-[var(--blue)]">
                                            
                                            XML
                                          </span>
                                          <div>
                                            
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                                              Documento fiscal eletrônico
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                                              NF-e em XML
                                            </p>
                                          </div>
                                        </div>
                                      ) : (
                                        <iframe
                                          src={getDocumentPreviewUrl(
                                            String(documento.url ?? ""),
                                          )}
                                          title={String(
                                            documento.nome_original ??
                                              "Documento fiscal",
                                          )}
                                          className="h-full w-full border-0 bg-white pointer-events-none"
                                        />
                                      )}
                                      <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[rgba(255,255,255,0.94)] px-2.5 py-1 text-[10px] font-semibold text-[var(--blue)] shadow-sm">
                                        
                                        {getDocumentTypeLabel(
                                          documento.tipo_documento,
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void handleDocumentDelete(
                                            documento.id,
                                          );
                                        }}
                                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.94)] text-[var(--rose)] shadow-sm transition hover:bg-white"
                                        aria-label="Remover documento"
                                        title="Remover documento"
                                      >
                                        
                                        <TrashIcon />
                                      </button>
                                    </div>
                                    <div className="px-3 py-2.5">
                                      
                                      <p className="truncate text-[11px] font-semibold text-[var(--ink)]">
                                        
                                        {String(
                                          documento.nome_original ??
                                            "Documento fiscal",
                                        )}
                                      </p>
                                      <div className="mt-1 flex items-center justify-between gap-2">
                                        
                                        <p className="text-[10px] text-[var(--muted)]">
                                          
                                          {formatFileSize(
                                            documento.tamanho_bytes,
                                          )}
                                          | Clique para visualizar
                                        </p>
                                        <select
                                          value={String(
                                            documento.tipo_documento ?? "DANFE",
                                          )}
                                          onClick={(event) =>
                                            event.stopPropagation()
                                          }
                                          onChange={(event) =>
                                            void handleDocumentTypeChange(
                                              documento.id,
                                              event.target.value,
                                            )
                                          }
                                          className="h-7 rounded-full border border-[var(--line)] bg-white px-2.5 text-[10px] font-semibold text-[var(--ink)] outline-none"
                                        >
                                          
                                          {documentTypeOptions.map((option) => (
                                            <option
                                              key={option.value}
                                              value={option.value}
                                            >
                                              
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {pendingDocuments.map((documento) => (
                                  <div
                                    key={documento.id}
                                    className="group overflow-hidden rounded-[16px] border border-dashed border-[rgba(37,99,235,0.22)] bg-[#fafafa] cursor-pointer"
                                    onClick={() =>
                                      openAssetPreview({
                                        type: "document",
                                        url: documento.previewUrl,
                                        name: documento.name,
                                        mimeType: documento.mimeType,
                                      })
                                    }
                                    title="Visualizar documento"
                                  >
                                    
                                    <div className="relative aspect-[4/3] overflow-hidden bg-[#eef2f7]">
                                      
                                      {documento.mimeType.includes("xml") ||
                                      documento.name
                                        .toLowerCase()
                                        .endsWith(".xml") ? (
                                        <div className="flex h-full flex-col items-start justify-between bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4">
                                          
                                          <span className="rounded-full bg-[rgba(37,99,235,0.12)] px-2.5 py-1 text-[10px] font-semibold text-[var(--blue)]">
                                            
                                            XML
                                          </span>
                                          <div>
                                            
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                                              Documento pendente
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                                              NF em fila de envio
                                            </p>
                                          </div>
                                        </div>
                                      ) : (
                                        <iframe
                                          src={getDocumentPreviewUrl(
                                            documento.previewUrl,
                                          )}
                                          title={documento.name}
                                          className="h-full w-full border-0 bg-white pointer-events-none"
                                        />
                                      )}
                                      <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[rgba(255,255,255,0.94)] px-2.5 py-1 text-[10px] font-semibold text-[var(--blue)] shadow-sm">
                                        
                                        {getDocumentTypeLabel(
                                          documento.tipoDocumento,
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void handleDocumentDelete(
                                            documento.id,
                                          );
                                        }}
                                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.94)] text-[var(--rose)] shadow-sm transition hover:bg-white"
                                        aria-label="Remover documento"
                                        title="Remover documento"
                                      >
                                        
                                        <TrashIcon />
                                      </button>
                                    </div>
                                    <div className="px-3 py-2.5">
                                      
                                      <p className="truncate text-[11px] font-semibold text-[var(--ink)]">
                                        {documento.name}
                                      </p>
                                      <div className="mt-1 flex items-center justify-between gap-2">
                                        
                                        <p className="text-[10px] text-[var(--muted)]">
                                          Pendente |
                                          {formatFileSize(documento.file.size)}
                                        </p>
                                        <select
                                          value={documento.tipoDocumento}
                                          onClick={(event) =>
                                            event.stopPropagation()
                                          }
                                          onChange={(event) =>
                                            void handleDocumentTypeChange(
                                              documento.id,
                                              event.target.value,
                                            )
                                          }
                                          className="h-7 rounded-full border border-[var(--line)] bg-white px-2.5 text-[10px] font-semibold text-[var(--ink)] outline-none"
                                        >
                                          
                                          {documentTypeOptions.map((option) => (
                                            <option
                                              key={option.value}
                                              value={option.value}
                                            >
                                              
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-[#fafafa] px-4 py-5 text-sm text-[var(--muted)]">
                                
                                Nenhuma Nota Fiscal selecionada.
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    ) : (
                      <div className={`grid gap-2.5 ${stepFormGridClassName}`}>
                        
                        {visibleFields.map((field) => {
                          const disabled =
                            isReadOnly ||
                            field.readOnly ||
                            field.disabled?.(form);
                          const commonClassName = "admin-input";
                          if (field.type === "textarea") {
                            return (
                              <label
                                key={field.name}
                                className={`admin-field ${useInlineSummary ? "sm:col-span-2 xl:col-span-3" : "md:col-span-2"}`}
                              >
                                
                                {field.label}
                                <textarea
                                  value={form[field.name] ?? ""}
                                  onChange={(event) =>
                                    updateField(field, event.target.value)
                                  }
                                  disabled={disabled}
                                  rows={
                                    field.rows ?? (useInlineSummary ? 2 : 4)
                                  }
                                  placeholder={field.placeholder}
                                  className="admin-textarea"
                                />
                              </label>
                            );
                          }
                          if (field.type === "select") {
                            const options = field.lookupKey
                              ? (lookups[field.lookupKey] ?? [])
                                  .filter((option) =>
                                    field.filterOption
                                      ? field.filterOption(
                                          option,
                                          form,
                                          lookups,
                                        )
                                      : true,
                                  )
                                  .map((option) => {
                                    const lookup = config.lookups?.find(
                                      (entry) => entry.key === field.lookupKey,
                                    );
                                    return {
                                      value: String(option.id ?? ""),
                                      label: lookup
                                        ? lookup.label(option)
                                        : String(option.id ?? ""),
                                    };
                                  })
                              : (field.options ?? []);
                            return (
                              <label key={field.name} className="admin-field">
                                
                                {field.label}
                                <select
                                  value={form[field.name] ?? ""}
                                  onChange={(event) =>
                                    updateField(field, event.target.value)
                                  }
                                  disabled={disabled}
                                  className={commonClassName}
                                >
                                  
                                  <option value="">Selecione</option>
                                  {options.map((option) => (
                                    <option
                                      key={`${field.name}-${option.value}`}
                                      value={option.value}
                                    >
                                      
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            );
                          }
                          return (
                            <label key={field.name} className="admin-field">
                              
                              {field.label}
                              <input
                                type={field.type}
                                value={form[field.name] ?? ""}
                                onChange={(event) =>
                                  updateField(field, event.target.value)
                                }
                                disabled={disabled}
                                placeholder={field.placeholder}
                                className={commonClassName}
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 mt-2.5 -mx-3 border-t border-[var(--line)] bg-[rgba(255,255,255,0.96)] px-3 pt-2.5 pb-1 backdrop-blur md:-mx-3.5 md:px-3.5">
              
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                
                <div className="flex items-center gap-3">
                  
                  {hasSteps && activeStepIndex > 0 ? (
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="admin-btn-secondary"
                    >
                      
                      Etapa anterior
                    </button>
                  ) : null}
                </div>
                <div className="flex items-center justify-end gap-3">
                  
                  <button
                    type="button"
                    onClick={() => void handlePrimaryAction()}
                    className="inline-flex h-9 min-w-[128px] items-center justify-center rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90"
                  >
                    
                    {isReadOnly
                      ? hasSteps && activeStepIndex < modalSteps.length - 1
                        ? "Próxima etapa"
                        : "Fechar"
                      : isAssetAttachmentsStep
                        ? "Concluir"
                        : hasSteps && activeStepIndex < modalSteps.length - 1
                          ? "Continuar"
                          : modalMode === "edit"
                            ? "Salvar alterações"
                            : "Salvar cadastro"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <SystemConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirmDialog(null)}
        onConfirm={() => void handleConfirmAction()}
      />
      {assetPreview ? (
        <div className="admin-dialog-overlay">
          
          <div className="panel-surface w-[min(94vw,980px)] overflow-hidden rounded-[24px] p-3 md:p-3.5 shadow-[0_22px_64px_rgba(15,23,42,0.22)]">
            
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-3">
              
              <div className="min-w-0">
                
                <p className="admin-modal-kicker">
                  
                  {assetPreview.type === "image"
                    ? "Imagem do patrimonio"
                    : "Documento fiscal"}
                </p>
                <h3 className="admin-modal-title truncate">
                  {assetPreview.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                
                <a
                  href={assetPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
                >
                  
                  Abrir em nova guia
                </a>
                <button
                  type="button"
                  onClick={closeAssetPreview}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  
                  Fechar
                </button>
              </div>
            </div>
            <div className="mt-3 rounded-[18px] border border-[var(--line)] bg-[#fafafa] px-3 py-3">
              
              <p className="text-[12px] leading-5 text-[var(--muted)]">
                
                {assetPreview.type === "image"
                  ? "Visualização ampliada da imagem anexada ao patrimonio."
                  : "Visualização do documento fiscal vinculado ao bem."}
              </p>
            </div>
            <div className="mt-3 flex min-h-[60vh] items-center justify-center rounded-[20px] border border-[var(--line)] bg-[#f8fafc] p-3">
              
              {assetPreview.type === "image" ? (
                <img
                  src={assetPreview.url}
                  alt={assetPreview.name}
                  className="max-h-[68vh] w-auto max-w-full rounded-[16px] object-contain"
                />
              ) : canRenderDocumentInline(assetPreview) ? (
                <iframe
                  src={getDocumentPreviewUrl(assetPreview.url)}
                  title={assetPreview.name}
                  className="h-[68vh] w-full rounded-[16px] border-0 bg-white"
                />
              ) : (
                <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-white px-6 py-8 text-center">
                  
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Visualização interna indisponivel
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    
                    Este arquivo nao pode ser exibido diretamente no painel. Use
                    a opção "Abrir em nova guia".
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}



