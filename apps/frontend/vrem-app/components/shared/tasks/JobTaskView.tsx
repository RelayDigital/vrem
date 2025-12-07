"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import {
  JobRequest,
  OrganizationMember,
  Technician,
  OrganizationCustomer,
  Media,
  MediaType,
} from "../../../types";
import { ChatMessage } from "../../../types/chat";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Calendar,
  Clock,
  Camera,
  Video,
  Plane,
  Sunset,
  User,
  Zap,
  AlertCircle,
  CheckCircle2,
  Send,
  AtSign,
  Maximize2,
  Link,
  ExternalLink,
  X,
  ArrowRightToLine,
  MoreHorizontal,
  Bold,
  Italic,
  Underline,
  Smile,
  ChevronDown,
  Edit,
  Trash2,
  Paperclip,
  FileText,
  MessageSquare,
  Strikethrough,
  List,
  ListOrdered,
  Indent,
  Code,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  File,
  Box,
  Upload,
  Grid3x3,
  Loader2,
  Navigation,
  Map as MapIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ImageWithFallback } from "../../common";
import { H3, H4, P, Small, Muted } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn } from "@/components/ui/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { SiGoogledrive, SiDropbox } from "react-icons/si";

import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
import { FaGoogleDrive, FaDropbox } from "react-icons/fa";
import { DiOnedrive } from "react-icons/di";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { fetchOrganizationTechnicians } from "@/lib/technicians";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useJobManagement } from "@/context/JobManagementContext";

type MediaCategory = "image" | "video" | "floor-plan" | "3d-content" | "file";

type MediaItem = {
  id: string;
  name: string;
  type: MediaCategory;
  url: string;
  thumbnail?: string;
  size: number;
  uploadedAt: Date;
  key?: string;
};

interface JobTaskViewProps {
  job: JobRequest | null;
  technician?: OrganizationMember["user"] & {
    role: string;
    accountType?: string;
  };
  projectManager?: OrganizationMember["user"] & { role: "PROJECT_MANAGER" };
  editor?: OrganizationMember["user"] & { role: "EDITOR" };
  messages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  currentUserAccountType?: string;
  isClient?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendMessage?: (
    content: string,
    channel: "TEAM" | "CUSTOMER",
    threadId?: string
  ) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onStatusChange?: (status: JobRequest["status"]) => void;
  onAssignTechnician?: () => void;
  onChangeTechnician?: () => void; // For reassigning technician
  onAssignCustomer?: (customerId: string) => void;
  onAssignProjectManager?: (userId: string) => void;
  onAssignEditor?: (userId: string) => void;
  variant?: "sheet" | "dialog" | "page";
  onFullScreen?: () => void; // Opens larger dialog
  onOpenInNewPage?: () => void; // Navigates to full page view
}

export function JobTaskView({
  job,
  technician,
  projectManager,
  editor,
  messages,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isClient = false,
  open,
  onOpenChange,
  currentUserAccountType,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onStatusChange,
  onAssignTechnician,
  onChangeTechnician,
  onAssignCustomer,
  onAssignProjectManager,
  onAssignEditor,
  variant = "sheet",
  onFullScreen,
  onOpenInNewPage,
}: JobTaskViewProps) {
  const { activeOrganizationId, activeMembership } = useCurrentOrganization();
  const jobManagement = useJobManagement();
  const isAgentUser = (currentUserAccountType || "").toUpperCase() === "AGENT";
  const [activeTab, setActiveTab] = useState<
    "description" | "discussion" | "attachments" | "media"
  >("discussion");
  const orgRoleUpper = (
    (activeMembership?.role ||
      (activeMembership as any)?.orgRole ||
      "") as string
  ).toUpperCase();
  const isEditorRole = orgRoleUpper === "EDITOR";
  const [activeChatTab, setActiveChatTab] = useState<"client" | "team">(
    isAgentUser ? "client" : "team"
  );
  const canViewCustomerChat = ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(
    orgRoleUpper
  );
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  );
  const [hasEditorContent, setHasEditorContent] = useState(false);
  const [hasEditEditorContent, setHasEditEditorContent] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [threeDUrl, setThreeDUrl] = useState<string>("");
  const [cloudStorageDialog, setCloudStorageDialog] = useState<{
    open: boolean;
    service: string;
  }>({ open: false, service: "" });
  const [connectingService, setConnectingService] = useState<string | null>(
    null
  );
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customers, setCustomers] = useState<OrganizationCustomer[]>([]);
  const [projectManagers, setProjectManagers] = useState<OrganizationMember[]>(
    []
  );
  const [editors, setEditors] = useState<OrganizationMember[]>([]);
  const processedMediaKeysRef = useRef<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const [pmSearch, setPmSearch] = useState("");
  const [editorSearch, setEditorSearch] = useState("");
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isAssignedProjectManager = useMemo(
    () => job?.projectManagerId === currentUserId,
    [currentUserId, job?.projectManagerId]
  );

  const canAssignTeamMembers = useMemo(() => {
    const orgRole = orgRoleUpper;
    return (
      ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(
        orgRole || ""
      ) || isAssignedProjectManager
    );
  }, [isAssignedProjectManager, orgRoleUpper]);
  const canAssignTechnicianOrEditor = canAssignTeamMembers;
  const canAssignProjectManager = useMemo(() => {
    const orgRole = orgRoleUpper;
    return ["OWNER", "ADMIN"].includes(orgRole || "");
  }, [orgRoleUpper]);
  const canAssign = canAssignTeamMembers;
  const canAssignCustomer = useMemo(() => {
    const orgRole = orgRoleUpper;
    return ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(orgRole || "");
  }, [orgRoleUpper]);
  const canDeleteProject = useMemo(() => {
    const orgRole = orgRoleUpper;
    if (orgRole === "EDITOR") {
      return false;
    }
    const isElevated = ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(orgRole);
    const isAgentCreator =
      orgRole === "AGENT" &&
      job?.projectManagerId &&
      job.projectManagerId === currentUserId;
    return isElevated || isAgentCreator || isAssignedProjectManager;
  }, [
    currentUserId,
    isAssignedProjectManager,
    job?.projectManagerId,
    orgRoleUpper,
  ]);
  const getInitials = (value?: string | null) =>
    value
      ? value
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
      : "NA";
  const renderAssigneeBadge = (name: string, avatar?: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className="h-7 w-7">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="text-xs bg-muted-foreground/20">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <span className="text-sm font-medium text-secondary">{name}</span>
      </TooltipContent>
    </Tooltip>
  );

  const filterPeople = <
    T extends {
      user?: { name?: string; email?: string };
      name?: string;
      email?: string;
    }
  >(
    list: T[],
    query: string,
    getName: (item: T) => string,
    getEmail?: (item: T) => string | undefined
  ) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const name = getName(item)?.toLowerCase() || "";
      const email = (getEmail?.(item) || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  };

  const filteredCustomers = useMemo(
    () =>
      filterPeople(
        customers,
        customerSearch,
        (c) => c.name || "",
        (c) => c.email
      ),
    [customers, customerSearch]
  );

  const filteredProjectManagers = useMemo(
    () =>
      filterPeople(
        projectManagers,
        pmSearch,
        (m) => m.user?.name || m.personalOrg?.legalName || "",
        (m) => m.user?.email
      ),
    [projectManagers, pmSearch]
  );

  const filteredEditors = useMemo(
    () =>
      filterPeople(
        editors,
        editorSearch,
        (m) => m.user?.name || m.personalOrg?.legalName || "",
        (m) => m.user?.email
      ),
    [editors, editorSearch]
  );
  const assignedCustomer = useMemo(() => {
    if (!job?.customerId) return null;
    return customers.find((customer) => customer.id === job.customerId) || null;
  }, [customers, job]);

  const assignedProjectManager = useMemo(() => {
    if (!job?.projectManagerId) return null;
    return (
      projectManagers.find(
        (member) =>
          member.userId === job.projectManagerId ||
          member.user?.id === job.projectManagerId
      ) || null
    );
  }, [projectManagers, job]);

  const assignedEditor = useMemo(() => {
    if (!job?.editorId) return null;
    return (
      editors.find(
        (member) =>
          member.userId === job.editorId || member.user?.id === job.editorId
      ) || null
    );
  }, [editors, job]);

  const customerDisplayName =
    assignedCustomer?.name || job?.clientName || "Unassigned";

  const projectManagerDisplayName =
    assignedProjectManager?.user?.name ||
    assignedProjectManager?.personalOrg?.legalName ||
    assignedProjectManager?.user?.email ||
    (projectManager as any)?.name ||
    (projectManager as any)?.fullName ||
    (projectManager as any)?.email ||
    (job as any)?.projectManager?.name ||
    (job as any)?.projectManager?.fullName ||
    (job as any)?.projectManager?.email ||
    (job?.projectManagerId ? "Assigned" : "Unassigned");

  const editorDisplayName =
    assignedEditor?.user?.name ||
    assignedEditor?.personalOrg?.legalName ||
    assignedEditor?.user?.email ||
    (editor as any)?.name ||
    (editor as any)?.fullName ||
    (editor as any)?.email ||
    (job as any)?.editor?.name ||
    (job as any)?.editor?.fullName ||
    (job as any)?.editor?.email ||
    (job?.editorId ? "Assigned" : "Unassigned");

  const projectManagerDisplayAvatar =
    assignedProjectManager?.user?.avatarUrl ||
    (projectManager as any)?.avatarUrl ||
    (job as any)?.projectManager?.avatarUrl ||
    "";

  const editorDisplayAvatar =
    assignedEditor?.user?.avatarUrl ||
    (editor as any)?.avatarUrl ||
    (job as any)?.editor?.avatarUrl ||
    "";

  useEffect(() => {
    if (!canViewCustomerChat && activeChatTab === "client") {
      setActiveChatTab("team");
    }
  }, [activeChatTab, canViewCustomerChat]);

  // Media mapping helpers need to be defined before effects
  const mapBackendTypeToCategory = useCallback(
    (type: string): MediaCategory => {
      switch ((type || "").toUpperCase()) {
        case MediaType.VIDEO:
          return "video";
        case MediaType.FLOORPLAN:
          return "floor-plan";
        case MediaType.DOCUMENT:
          return "file";
        case MediaType.PHOTO:
        default:
          return "image";
      }
    },
    []
  );

  const mapCategoryToBackendType = useCallback(
    (category: MediaCategory): MediaType => {
      switch (category) {
        case "video":
          return MediaType.VIDEO;
        case "floor-plan":
          return MediaType.FLOORPLAN;
        case "file":
        case "3d-content":
          return MediaType.DOCUMENT;
        case "image":
        default:
          return MediaType.PHOTO;
      }
    },
    []
  );

  const mapMediaRecordToItem = useCallback(
    (media: Media): MediaItem => ({
      id: media.id,
      name: media.filename,
      type: mapBackendTypeToCategory(media.type),
      url: media.cdnUrl || media.key,
      size: media.size,
      uploadedAt: new Date(media.createdAt),
      key: media.key,
    }),
    [mapBackendTypeToCategory]
  );

  const messageEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        underline: false, // Disable underline from StarterKit to use our extension
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder: "Type a message...",
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base focus:outline-none max-w-none min-h-[64px] max-h-[200px] overflow-y-auto px-3.5 py-3 text-sm",
      },
    },
  });

  useEffect(() => {
    const loadData = async () => {
      const orgId = activeOrganizationId || job?.organizationId;
      if (!orgId || !open) return;
      api.organizations.setActiveOrganization(orgId);
      try {
        const customersPromise = canAssignCustomer
          ? api.customers.list()
          : Promise.resolve<OrganizationCustomer[]>([]);
        const [techs, custs, members] = await Promise.all([
          fetchOrganizationTechnicians(),
          customersPromise,
          api.organizations.listMembers(),
        ]);
        setTechnicians(techs);
        setCustomers(canAssignCustomer ? custs : []);
        setProjectManagers(
          members.filter((m) =>
            ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(
              (m.role || (m as any).orgRole || "") as string
            )
          )
        );
        setEditors(
          members.filter(
            (m) => (m.role || (m as any).orgRole || "") === "EDITOR"
          )
        );
      } catch (error) {
        console.error("Failed to load assignment data", error);
      }
    };
    void loadData();
  }, [activeOrganizationId, job?.organizationId, open]);

  useEffect(() => {
    if (job?.media && job.media.length > 0) {
      const mapped = job.media.map(mapMediaRecordToItem);
      setUploadedMedia(mapped);
      mapped.forEach((m) => processedMediaKeysRef.current.add(m.key || m.id));
    } else if (job?.id) {
      setUploadedMedia([]);
      processedMediaKeysRef.current.clear();
    } else {
      setUploadedMedia([]);
      processedMediaKeysRef.current.clear();
    }
  }, [job?.id, job?.media, mapMediaRecordToItem]);

  useEffect(() => {
    let cancelled = false;
    const loadProjectMedia = async () => {
      if (!job?.id || !open) return;
      const orgId = activeOrganizationId || job?.organizationId;
      if (orgId) {
        api.organizations.setActiveOrganization(orgId);
      }
      setIsLoadingMedia(true);
      try {
        const media = await api.media.listForProject(job.id);
        if (!cancelled) {
          const mapped = media.map(mapMediaRecordToItem);
          setUploadedMedia(mapped);
          mapped.forEach((m) =>
            processedMediaKeysRef.current.add(m.key || m.id)
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load media for project", error);
          toast.error("Failed to load media for this project");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMedia(false);
        }
      }
    };

    void loadProjectMedia();

    return () => {
      cancelled = true;
    };
  }, [
    activeOrganizationId,
    job?.id,
    job?.organizationId,
    mapMediaRecordToItem,
    open,
  ]);

  const handleAssignCustomerInline = async (customerId: string) => {
    if (!job || !customerId || !canAssignCustomer) return;
    setLoadingAssignments(true);
    try {
      if (onAssignCustomer) {
        await onAssignCustomer(customerId);
        await jobManagement.refreshJobs();
        const refreshed = jobManagement.getJobById(job.id);
        if (refreshed) {
          jobManagement.selectJob(refreshed);
        }
      } else {
        const updatedProject = await api.projects.assignCustomer(
          job.id,
          customerId
        );
        jobManagement.updateJob(job.id, updatedProject);
        jobManagement.selectJob(api.mapProjectToJobCard(updatedProject));
      }
      toast.success("Customer assigned");
    } catch (error: any) {
      console.error("Failed to assign customer", error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleAssignProjectManagerInline = async (userId: string) => {
    if (!job || !userId || !canAssignProjectManager) return;
    setLoadingAssignments(true);
    try {
      if (onAssignProjectManager) {
        await onAssignProjectManager(userId);
        await jobManagement.refreshJobs();
        const refreshed = jobManagement.getJobById(job.id);
        if (refreshed) {
          jobManagement.selectJob(refreshed);
        }
      } else {
        const updatedProject = await api.projects.assignProjectManager(
          job.id,
          userId
        );
        jobManagement.updateJob(job.id, updatedProject);
        jobManagement.selectJob(api.mapProjectToJobCard(updatedProject));
      }
      toast.success("Project manager assigned");
    } catch (error: any) {
      console.error("Failed to assign project manager", error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleAssignEditorInline = async (userId: string) => {
    if (!job || !userId || !canAssignTechnicianOrEditor) return;
    setLoadingAssignments(true);
    try {
      if (onAssignEditor) {
        await onAssignEditor(userId);
        await jobManagement.refreshJobs();
        const refreshed = jobManagement.getJobById(job.id);
        if (refreshed) {
          jobManagement.selectJob(refreshed);
        }
      } else {
        const updatedProject = await api.projects.assignEditor(job.id, userId);
        jobManagement.updateJob(job.id, updatedProject);
        jobManagement.selectJob(api.mapProjectToJobCard(updatedProject));
      }
      toast.success("Editor assigned");
    } catch (error: any) {
      console.error("Failed to assign editor", error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Editor for editing messages
  const editMessageEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        underline: false,
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base focus:outline-none max-w-none min-h-[64px] max-h-[120px] overflow-y-auto px-3.5 py-3 text-sm",
      },
    },
  });

  // Update placeholder when chat tab changes
  useEffect(() => {
    if (messageEditor) {
      const placeholderText =
        activeChatTab === "client"
          ? "Type a message for the client..."
          : "Type a message for the team...";
      const placeholderExt = messageEditor.extensionManager.extensions.find(
        (ext) => ext.name === "placeholder"
      );
      if (placeholderExt && placeholderExt.options) {
        placeholderExt.options.placeholder = placeholderText;
        messageEditor.view.dispatch(messageEditor.state.tr);
      }
    }
  }, [messageEditor, activeChatTab]);

  useEffect(() => {
    if (messageEditor) {
      messageEditor.setEditable(!(isClient && activeChatTab === "team"));
    }
  }, [messageEditor, isClient, activeChatTab]);

  useEffect(() => {
    if (!open && messageEditor) {
      messageEditor.commands.clearContent();
      setReplyingTo(null);
      setActiveTab("discussion");
      setHasEditorContent(false);
      setEditingMessageId(null);
      if (editMessageEditor) {
        editMessageEditor.commands.clearContent();
      }
    }
  }, [open, messageEditor, editMessageEditor]);

  // Track editor content changes
  useEffect(() => {
    if (!messageEditor) return;

    const updateContent = () => {
      const text = messageEditor.getText().trim();
      setHasEditorContent(text.length > 0);
    };

    messageEditor.on("update", updateContent);
    messageEditor.on("selectionUpdate", updateContent);

    // Initial check
    updateContent();

    return () => {
      messageEditor.off("update", updateContent);
      messageEditor.off("selectionUpdate", updateContent);
    };
  }, [messageEditor]);

  const sanitizeMessageHtml = useCallback((html: string) => {
    if (!html) return html;
    let cleaned = html.trim();
    // Remove trailing empty paragraphs or <p><br></p>
    cleaned = cleaned.replace(/(<p><br\s*\/?><\/p>\s*)+$/gi, "");
    cleaned = cleaned.replace(/(<p>\s*<\/p>\s*)+$/gi, "");
    return cleaned;
  }, []);

  const handleSend = useCallback(() => {
    if (!messageEditor || !onSendMessage) return;

    const htmlContent = sanitizeMessageHtml(messageEditor.getHTML());
    const textContent = messageEditor.getText().trim();

    if (!textContent) return;

    const effectiveChatTab = isAgentUser ? "client" : activeChatTab;
    const channel = effectiveChatTab === "client" ? "CUSTOMER" : "TEAM";
    onSendMessage(htmlContent, channel, replyingTo?.id);
    messageEditor.commands.clearContent();
    setReplyingTo(null);
    setHasEditorContent(false);
    messageEditor.commands.focus();
  }, [
    messageEditor,
    onSendMessage,
    activeChatTab,
    replyingTo,
    isAgentUser,
    sanitizeMessageHtml,
  ]);

  const handleEdit = useCallback((message: ChatMessage) => {
    setEditingMessageId(message.id);
  }, []);

  // Update edit editor content when editing message changes
  useEffect(() => {
    if (editingMessageId && editMessageEditor) {
      const message = messages.find((m) => m.id === editingMessageId);
      if (message) {
        // Ensure editor is editable
        editMessageEditor.setEditable(true);
        // Use setTimeout to ensure editor is ready
        setTimeout(() => {
          editMessageEditor.commands.setContent(message.content);
          editMessageEditor.commands.focus("end");
          // Set initial content state
          setHasEditEditorContent(
            editMessageEditor.getText().trim().length > 0
          );
        }, 50);
      }
    } else if (!editingMessageId && editMessageEditor) {
      // Clear editor when not editing
      editMessageEditor.commands.clearContent();
      setHasEditEditorContent(false);
    }
  }, [editingMessageId, editMessageEditor, messages]);

  // Track edit editor content changes
  useEffect(() => {
    if (!editMessageEditor) return;

    const updateContent = () => {
      const text = editMessageEditor.getText().trim();
      setHasEditEditorContent(text.length > 0);
    };

    editMessageEditor.on("update", updateContent);
    editMessageEditor.on("selectionUpdate", updateContent);

    // Initial check
    updateContent();

    return () => {
      editMessageEditor.off("update", updateContent);
      editMessageEditor.off("selectionUpdate", updateContent);
    };
  }, [editMessageEditor]);

  const handleSaveEdit = useCallback(() => {
    if (!editMessageEditor || !editingMessageId || !onEditMessage) return;

    const htmlContent = sanitizeMessageHtml(editMessageEditor.getHTML());
    const textContent = editMessageEditor.getText().trim();

    if (!textContent) {
      setEditingMessageId(null);
      return;
    }

    onEditMessage(editingMessageId, htmlContent);
    setEditingMessageId(null);
    editMessageEditor.commands.clearContent();
  }, [editMessageEditor, editingMessageId, onEditMessage, sanitizeMessageHtml]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    if (editMessageEditor) {
      editMessageEditor.commands.clearContent();
    }
  }, [editMessageEditor]);

  const handleDeleteClick = useCallback((messageId: string) => {
    setDeletingMessageId(messageId);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deletingMessageId && onDeleteMessage) {
      onDeleteMessage(deletingMessageId);
      setDeletingMessageId(null);
    }
  }, [deletingMessageId, onDeleteMessage]);

  const handleDeleteCancel = useCallback(() => {
    setDeletingMessageId(null);
  }, []);

  useEffect(() => {
    if (!messageEditor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    };

    const messageEditorElement = messageEditor.view.dom;
    messageEditorElement.addEventListener("keydown", handleKeyDown);

    return () => {
      messageEditorElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [messageEditor, handleSend]);

  const handleDeleteProject = useCallback(async () => {
    if (!job) return;
    setIsDeletingProject(true);
    try {
      await jobManagement.deleteJob(job.id);
      setDeleteProjectDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      // Toast handled in context
    } finally {
      setIsDeletingProject(false);
    }
  }, [job, jobManagement, onOpenChange]);

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "photo":
        return Camera;
      case "video":
        return Video;
      case "aerial":
        return Plane;
      case "twilight":
        return Sunset;
      default:
        return Camera;
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          label: "Urgent",
          color: "text-destructive",
        };
      case "rush":
        return {
          label: "Rush",
          color: "text-orange-500",
        };
      default:
        return {
          label: "Standard",
          color: "text-primary",
        };
    }
  };

  const getStatusConfig = (status: JobRequest["status"]) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          bgColor: "bg-status-pending",
          textColor: "text-status-pending",
          indicatorColor: "bg-status-pending",
        };
      case "assigned":
        return {
          label: "Assigned",
          bgColor: "bg-status-assigned",
          textColor: "text-status-assigned",
          indicatorColor: "bg-status-assigned",
        };
      case "in_progress":
        return {
          label: "In Progress",
          bgColor: "bg-status-in-progress",
          textColor: "text-status-in-progress",
          indicatorColor: "bg-status-in-progress",
        };
      case "editing":
        return {
          label: "Editing",
          bgColor: "bg-status-editing",
          textColor: "text-status-editing",
          indicatorColor: "bg-status-editing",
        };
      case "delivered":
        return {
          label: "Delivered",
          bgColor: "bg-status-delivered",
          textColor: "text-status-delivered",
          indicatorColor: "bg-status-delivered",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bgColor: "bg-status-cancelled",
          textColor: "text-status-cancelled",
          indicatorColor: "bg-status-cancelled",
        };
      default:
        return {
          label: status,
          bgColor: "bg-muted",
          textColor: "text-muted-foreground",
          indicatorColor: "bg-muted-foreground",
        };
    }
  };

  const handleCopyLink = () => {
    if (!job) return;

    // Use canonical route for job detail
    const jobTaskUrl = `${window.location.origin}/jobs/${job.id}`;
    navigator.clipboard.writeText(jobTaskUrl);
    toast.success("Link copied to clipboard");
  };

  const handleFullScreen = () => {
    if (onFullScreen) {
      onFullScreen();
    }
  };

  const handleMarkComplete = () => {
    if (onStatusChange) {
      onStatusChange("delivered");
    }
  };

  const getMediaTypeIcon = (type: MediaCategory) => {
    switch (type) {
      case "image":
        return <ImageIcon className="size-10 text-muted-foreground" />;
      case "video":
        return <Video className="size-10 text-muted-foreground" />;
      case "floor-plan":
        return <FileText className="size-10 text-muted-foreground" />;
      case "3d-content":
        return <Box className="size-10 text-muted-foreground" />;
      default:
        return <File className="size-10 text-muted-foreground" />;
    }
  };

  const handleUploadcareSuccess = async (
    info: any,
    category: MediaCategory
  ) => {
    if (!info || !info.allEntries || info.allEntries.length === 0 || !job)
      return;

    const orgId = activeOrganizationId || job.organizationId;
    if (orgId) {
      api.organizations.setActiveOrganization(orgId);
    }

    const createdItems: MediaItem[] = [];

    for (const entry of info.allEntries) {
      const payload = {
        key: entry.uuid || entry.fileId || entry.cdnUrl,
        cdnUrl: entry.cdnUrl,
        filename: entry.name,
        size: entry.size,
        type: mapCategoryToBackendType(category),
      };

      if (!payload.key || processedMediaKeysRef.current.has(payload.key)) {
        continue;
      }

      try {
        const mediaRecord = await api.media.addToProject(job.id, payload);
        createdItems.push(mapMediaRecordToItem(mediaRecord));
        processedMediaKeysRef.current.add(payload.key);
      } catch (error) {
        console.error("Failed to register media upload", error);
        toast.error(`Failed to save ${entry?.name || "upload"}`);
      }
    }

    if (createdItems.length > 0) {
      setUploadedMedia((prev) => {
        const merged = [...prev];
        createdItems.forEach((item) => {
          const exists = merged.some(
            (m) => m.id === item.id || m.key === item.key
          );
          if (!exists) merged.push(item);
        });
        return merged;
      });
      toast.success(
        `${createdItems.length} media item${
          createdItems.length > 1 ? "s" : ""
        } added`
      );
    }
  };

  const getMediaByCategory = (category: MediaCategory) => {
    return uploadedMedia.filter((item) => item.type === category);
  };

  const hasAnyMedia = useMemo(
    () => uploadedMedia && uploadedMedia.length > 0,
    [uploadedMedia]
  );

  const priorityConfig = getPriorityConfig(job?.priority || "standard");
  const statusConfig = getStatusConfig(job?.status || "pending");

  const getUploadcareAcceptTypes = (category: MediaCategory) => {
    switch (category) {
      case "image":
        return "image/*";
      case "video":
        return "video/*";
      case "floor-plan":
        return "image/*";
      case "file":
        return "*";
      default:
        return "*";
    }
  };

  const handleViewMedia = (item: MediaItem) => {
    // Open media in new window or modal
    window.open(item.url, "_blank");
  };

  const handleDeleteMedia = async (id: string) => {
    if (!job) return;
    const orgId = activeOrganizationId || job.organizationId;
    if (orgId) {
      api.organizations.setActiveOrganization(orgId);
    }
    try {
      await api.media.deleteFromProject(job.id, id);
      setUploadedMedia((prev) => {
        const item = prev.find((m) => m.id === id);
        if (item && item.url.startsWith("blob:")) {
          URL.revokeObjectURL(item.url);
        }
        const filtered = prev.filter((m) => m.id !== id);
        if (item?.key) {
          processedMediaKeysRef.current.delete(item.key);
        }
        return filtered;
      });
      toast.success("Media deleted");
    } catch (error) {
      console.error("Failed to delete media", error);
      toast.error("Failed to delete media");
    }
  };

  const handleUrlUpload = async (url: string, category: "3d-content") => {
    if (!url.trim() || !job) return;

    // Validate URL
    try {
      new URL(url);
    } catch {
      // Invalid URL, could show error message here
      return;
    }

    const urlParts = url.split("/");
    const fileName = urlParts[urlParts.length - 1] || "3D Model";

    try {
      const orgId = activeOrganizationId || job.organizationId;
      if (orgId) {
        api.organizations.setActiveOrganization(orgId);
      }
      if (processedMediaKeysRef.current.has(url)) {
        toast.success("Media already added");
        setThreeDUrl("");
        return;
      }
      const mediaRecord = await api.media.addToProject(job.id, {
        key: url,
        cdnUrl: url,
        filename: fileName,
        size: 0,
        type: mapCategoryToBackendType(category),
      });
      processedMediaKeysRef.current.add(url);
      setUploadedMedia((prev) => {
        const mapped = mapMediaRecordToItem(mediaRecord);
        const exists = prev.some(
          (m) => m.id === mapped.id || m.key === mapped.key
        );
        return exists ? prev : [...prev, mapped];
      });
      toast.success("Media added");
    } catch (error) {
      console.error("Failed to save media URL", error);
      toast.error("Failed to save media URL");
    } finally {
      setThreeDUrl("");
    }
  };

  const handleCloudStorage = (
    service: "google-drive" | "dropbox" | "onedrive",
    category: MediaCategory
  ) => {
    // This would integrate with the respective cloud storage APIs
    // For now, we'll show a placeholder implementation
    console.log(`Opening ${service} file picker for ${category}`);

    // In a real implementation, you would:
    // 1. Initialize the cloud storage SDK (e.g., Google Drive API, Dropbox API, OneDrive API)
    // 2. Open a file picker dialog
    // 3. Handle the selected files
    // 4. Download/import the files and add them to uploadedMedia

    // Example placeholder:
    // if (service === "google-drive") {
    //   // Use Google Drive Picker API
    //   window.gapi.load('picker', () => {
    //     const picker = new google.picker.PickerBuilder()
    //       .setOAuthToken(accessToken)
    //       .addView(google.picker.ViewId.DOCS)
    //       .setCallback((data) => {
    //         if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
    //           // Handle selected files
    //         }
    //       })
    //       .build();
    //     picker.setVisible(true);
    //   });
    // }

    // Show alert dialog instead of browser alert
    const serviceName = service
      .replace("-", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    setConnectingService(service);
    // Simulate a delay to show the spinner
    setTimeout(() => {
      setCloudStorageDialog({ open: true, service: serviceName });
    }, 500);
  };

  const renderMediaCategory = (
    category: MediaCategory,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    const categoryMedia = getMediaByCategory(category);
    if (isAgentUser && categoryMedia.length === 0) {
      return null;
    }
    const uploadsDisabled = isAgentUser;
    const isDragging = draggingCategory === category;
    const categoryName =
      category === "floor-plan"
        ? "Floor Plans"
        : category === "3d-content"
        ? "3D Content"
        : category.charAt(0).toUpperCase() + category.slice(1) + "s";

    // Special handling for 3D Content (URL input)
    if (category === "3d-content") {
      return (
        <div className="py-4 space-y-4">
          {categoryMedia.length === 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="Enter 3D model URL (e.g., https://example.com/model.glb)"
                    value={threeDUrl}
                    onChange={(e) => setThreeDUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !uploadsDisabled) {
                        handleUrlUpload(threeDUrl, "3d-content");
                      }
                    }}
                    disabled={uploadsDisabled}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleUrlUpload(threeDUrl, "3d-content")}
                    disabled={!threeDUrl.trim() || uploadsDisabled}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Add URL
                  </Button>
                </div>
                <P className="text-xs text-muted-foreground">
                  {uploadsDisabled
                    ? "Media uploads are not available for agent accounts. You’ll see shared media here once it’s added."
                    : "Enter a URL to a 3D model file (GLB, GLTF, OBJ, FBX, etc.)"}
                </P>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <P className="text-sm font-medium text-foreground">
                  {categoryMedia.length}{" "}
                  {categoryMedia.length === 1 ? "item" : "items"}
                </P>
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="Enter 3D model URL"
                    value={threeDUrl}
                    onChange={(e) => setThreeDUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !uploadsDisabled) {
                        handleUrlUpload(threeDUrl, "3d-content");
                      }
                    }}
                    disabled={uploadsDisabled}
                    className="w-[300px]"
                  />
                  <Button
                    onClick={() => handleUrlUpload(threeDUrl, "3d-content")}
                    disabled={!threeDUrl.trim() || uploadsDisabled}
                    variant="outline"
                    size="sm"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Add URL
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categoryMedia.map((item, index) => (
                  <div
                    key={item.id || `media-${index}-${item.url}`}
                    className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted hover:border-primary transition-colors"
                  >
                    <div className="size-full flex flex-col items-center justify-center bg-muted p-4">
                      {getMediaTypeIcon(item.type)}
                      <P className="text-xs text-muted-foreground mt-2 text-center line-clamp-2">
                        {item.name}
                      </P>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-background/90 hover:bg-background"
                          onClick={() => handleViewMedia(item)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-background/90 hover:bg-background hover:text-destructive"
                          onClick={() => handleDeleteMedia(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <P className="text-xs text-white truncate">{item.name}</P>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (categoryMedia.length === 0) {
      // Show upload area when empty (non-agents only)
      if (uploadsDisabled) {
        return null;
      }

      return (
        <div className="py-4 space-y-4">
          {(category === "image" ||
            category === "video" ||
            category === "floor-plan" ||
            category === "file") && (
            <div className="flex flex-col items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <FileUploaderRegular
                  pubkey={
                    process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY ||
                    "dbf470d49c954f9f6143"
                  }
                  classNameUploader="uc-light uc-gray"
                  sourceList="local, camera, gdrive, facebook"
                  userAgentIntegration="llm-nextjs"
                  filesViewMode="grid"
                  useCloudImageEditor={false}
                  accept={getUploadcareAcceptTypes(category)}
                  onChange={(info) =>
                    void handleUploadcareSuccess(info, category)
                  }
                  onCommonUploadSuccess={(e) =>
                    console.log(
                      "Uploaded files URL list",
                      e.successEntries.map((entry: any) => entry.cdnUrl)
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show gallery when there are items
    return (
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <P className="text-sm font-medium text-foreground">
            {categoryMedia.length}{" "}
            {categoryMedia.length === 1 ? "item" : "items"}
          </P>
          <div className="flex items-center gap-2 flex-wrap">
            {!uploadsDisabled &&
              (category === "image" ||
                category === "video" ||
                category === "floor-plan" ||
                category === "file") && (
                <div onClick={(e) => e.stopPropagation()}>
                  <FileUploaderRegular
                    pubkey={
                      process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY ||
                      "dbf470d49c954f9f6143"
                    }
                    classNameUploader="uc-light uc-gray"
                    sourceList="local, camera, gdrive, facebook"
                    userAgentIntegration="llm-nextjs"
                    filesViewMode="grid"
                    useCloudImageEditor={false}
                    accept={getUploadcareAcceptTypes(category)}
                    onChange={(info) =>
                      void handleUploadcareSuccess(info, category)
                    }
                    onCommonUploadSuccess={(e) =>
                      console.log(
                        "Uploaded files URL list",
                        e.successEntries.map((entry: any) => entry.cdnUrl)
                      )
                    }
                  />
                </div>
              )}
            {/* {!uploadsDisabled &&
              (category === "image" ||
                category === "video" ||
                category === "floor-plan" ||
                category === "file") && (
              <ButtonGroup orientation="horizontal">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloudStorage("google-drive", category)}
                  className="flex items-center gap-2"
                >
                  <FaGoogleDrive className="h-4 w-4" />
                  Google Drive
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloudStorage("dropbox", category)}
                  className="flex items-center gap-2"
                >
                  <FaDropbox className="h-4 w-4" />
                  Dropbox
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloudStorage("onedrive", category)}
                  className="flex items-center gap-2"
                >
                  <DiOnedrive className="h-4 w-4" />
                  OneDrive
                </Button>
              </ButtonGroup>
            )} */}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categoryMedia.map((item, index) => (
            <div
              key={item.id || `media-${index}-${item.url}`}
              className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted hover:border-primary transition-colors"
            >
              {(item.type === "image" || item.type === "floor-plan") && (
                <img
                  src={item.url}
                  alt={item.name}
                  className="size-full object-cover"
                />
              )}
              {item.type === "video" && (
                <div className="size-full flex items-center justify-center bg-muted">
                  <Video className="size-12 text-muted-foreground" />
                </div>
              )}
              {(item.type === "3d-content" || item.type === "file") && (
                <div className="size-full flex flex-col items-center justify-center bg-muted p-4">
                  {getMediaTypeIcon(item.type)}
                  <P className="text-xs text-muted-foreground mt-2 text-center line-clamp-2">
                    {item.name}
                  </P>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-background/90 hover:bg-background"
                    onClick={() => handleViewMedia(item)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-background/90 hover:bg-background hover:text-destructive"
                    onClick={() => handleDeleteMedia(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <P className="text-xs text-white truncate">{item.name}</P>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Normalize chatType: treat agent messages as customer chat regardless of backend value
  const visibleMessages = useMemo(() => {
    return messages.map((m) => {
      const isAgentMessage =
        (m as any)?.user?.accountType === "AGENT" ||
        (m as any)?.user?.account_type === "AGENT";
      const channel =
        (m as any)?.channel ||
        (isAgentMessage
          ? "CUSTOMER"
          : m.chatType === "client"
          ? "CUSTOMER"
          : "TEAM");
      const chatType: "client" | "team" =
        channel === "CUSTOMER" ? "client" : "team";
      return {
        ...m,
        channel,
        chatType,
        thread: (m as any).thread ?? m.threadId ?? null,
      };
    });
  }, [messages]);

  // Filter messages by chat type
  const clientMessages = visibleMessages.filter((m) => m.chatType === "client");
  const teamMessages = visibleMessages.filter((m) => m.chatType === "team");

  const buildThreads = (messageList: ChatMessage[]) => {
    const byId = new Map<string, any>();
    const roots: any[] = [];

    messageList.forEach((m) => {
      byId.set(m.id, { ...m, replies: [] as any[] });
    });

    byId.forEach((node) => {
      if (node.thread && byId.has(node.thread)) {
        byId.get(node.thread).replies.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortByDate = (arr: any[]) =>
      arr.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    const sortTree = (arr: any[]) => {
      sortByDate(arr);
      arr.forEach((n) => sortTree(n.replies));
    };
    sortTree(roots);
    return roots;
  };

  const clientThreaded = useMemo(
    () => buildThreads(clientMessages),
    [clientMessages]
  );
  const teamThreaded = useMemo(
    () => buildThreads(teamMessages),
    [teamMessages]
  );
  const [expandedThreads, setExpandedThreads] = useState<
    Record<string, boolean>
  >({});

  const renderMessage = (message: any, depth = 0) => {
    const threadMessages = message.replies || [];
    const isOwnMessage = message.userId === currentUserId;
    const isEditing = editingMessageId === message.id;
    const isCollapsed =
      expandedThreads[message.id] === false && threadMessages.length > 0;

    return (
      <div
        key={message.id}
        className={cn("flex gap-2.5 relative", depth > 0 && "mt-3")}
        style={{ marginLeft: depth > 0 ? depth * 16 : 0 }}
      >
        {/* User Avatar */}
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={message.userAvatar} alt={message.userName} />
          <AvatarFallback className="text-xs bg-muted">
            {message.userName
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="group">
            {/* Message Header */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm font-medium text-foreground">
                {message.userName}
              </span>
              <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">
                {format(new Date(message.createdAt), "MMM d, h:mm a")}
              </span>
            </div>

            {/* Message Editor */}
            {isEditing ? (
              <div className="mb-1.5">
                <div className="bg-muted/50 border border-border rounded-2xl overflow-hidden flex flex-col">
                  <EditorContent
                    editor={editMessageEditor}
                    className="[&_.ProseMirror]:min-h-[64px] [&_.ProseMirror]:max-h-[120px] [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:px-3.5 [&_.ProseMirror]:py-3 [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-foreground [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:prose [&_.ProseMirror]:prose-sm [&_.ProseMirror]:max-w-none [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline"
                  />
                  <div className="flex items-center justify-end gap-2 px-3.5 py-2 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-xs"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSaveEdit}
                      disabled={!editMessageEditor || !hasEditEditorContent}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="text-[13px] leading-relaxed text-foreground wrap-break-word mb-1.5 prose prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            )}

            {/* Message Actions */}
            {!isEditing && (
              <div className="flex items-center gap-2.5 mt-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setReplyingTo(message)}
                >
                  Reply
                </Button>
                {isOwnMessage && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEdit(message)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteClick(message.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Threaded Replies */}
          {threadMessages.length > 0 && (
            <div className="mt-2 space-y-2 relative pl-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() =>
                    setExpandedThreads((prev) => ({
                      ...prev,
                      [message.id]: isCollapsed ? true : false,
                    }))
                  }
                >
                  {isCollapsed
                    ? `Show replies (${threadMessages.length})`
                    : "Hide replies"}
                </Button>
              </div>
              {!isCollapsed &&
                threadMessages
                  .sort(
                    (a: any, b: any) =>
                      new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime()
                  )
                  .map((threadMsg: any) => renderMessage(threadMsg, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render header content (shared between Sheet and Dialog)
  const renderHeader = (
    TitleComponent: typeof SheetTitle | typeof DialogTitle
  ) => (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        variant === "sheet"
          ? "sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
          : "p-4"
      )}
    >
      {/* Content Header */}
      <Item size="sm" variant="outline" className="size-full">
        <ItemMedia className="">
          <MapPin className="size-6" />
        </ItemMedia>
        <ItemContent className="">
          <ItemTitle className="">{job?.propertyAddress || "Job"}</ItemTitle>
          {!isAgentUser && job?.clientName && (
            <ItemDescription className="">
              Client: {job.clientName}
            </ItemDescription>
          )}
        </ItemContent>
        <ItemActions className="">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {onFullScreen && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    handleFullScreen();
                  }}
                  className="cursor-pointer"
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  View full screen
                </DropdownMenuItem>
              )}
              {onOpenInNewPage && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onOpenInNewPage();
                  }}
                  className="cursor-pointer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in new page
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleCopyLink();
                }}
                className="cursor-pointer"
              >
                <Link className="mr-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              {onStatusChange && job?.status !== "delivered" && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    handleMarkComplete();
                  }}
                  className="cursor-pointer"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as complete
                </DropdownMenuItem>
              )}
              {canDeleteProject && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setDeleteProjectDialogOpen(true);
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete job
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8"
                >
                  {variant === "sheet" ? (
                    <ArrowRightToLine className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ItemActions>
      </Item>
    </div>
  );

  // Render footer content (shared between Sheet and Dialog)
  const renderFooter = (
    FooterComponent: typeof SheetFooter | typeof DialogFooter | (() => null)
  ) => {
    const footerContent = (
      <>
        {/* Chat Type Tabs - Only show when Discussion tab is active */}
        {activeTab === "discussion" && !isAgentUser && (
          <div className="flex items-center gap-6 mb-4">
            {canViewCustomerChat && (
              <Button
                variant="ghost"
                onClick={() => setActiveChatTab("client")}
                className={cn(
                  "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                  activeChatTab === "client"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="size-3.5" />
                Customer Chat
                {activeChatTab === "client" && (
                  <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => setActiveChatTab("team")}
              className={cn(
                "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                activeChatTab === "team"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="size-3.5" />
              Team Chat
              {!isClient && (
                <Badge variant="secondary" className="ml-1 text-xs h-4 px-1.5">
                  Private
                </Badge>
              )}
              {activeChatTab === "team" && (
                <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </Button>
          </div>
        )}
        {replyingTo && (
          <div className="flex items-center justify-between bg-muted p-3 rounded-lg text-sm mb-sm">
            <span className="text-muted-foreground">
              Replying to {replyingTo.userName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="h-6 text-xs"
            >
              Cancel
            </Button>
          </div>
        )}
        {/* Editor with Avatar */}
        <div className="flex flex-col gap-0">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={currentUserAvatar} alt={currentUserName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {currentUserName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative bg-muted/50 border border-border rounded-2xl overflow-hidden flex flex-col">
              <EditorContent
                editor={messageEditor}
                className="[&_.ProseMirror]:min-h-[64px] [&_.ProseMirror]:max-h-[200px] [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:px-3.5 [&_.ProseMirror]:py-3 [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-foreground [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:prose [&_.ProseMirror]:prose-sm [&_.ProseMirror]:max-w-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline"
              />

              {/* Formatting Toolbar and Comment Button inside editor */}
              <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/40">
                {/* Formatting Buttons */}
                {isMobile ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-muted"
                        disabled={
                          !messageEditor ||
                          (isClient && activeChatTab === "team")
                        }
                      >
                        <MoreHorizontal className="size-3.5 text-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("bold") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() =>
                            messageEditor?.chain().focus().toggleBold().run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <Bold className="size-3.5 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("italic") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() =>
                            messageEditor?.chain().focus().toggleItalic().run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <Italic className="size-3.5 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("underline") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() =>
                            messageEditor
                              ?.chain()
                              .focus()
                              .toggleUnderline()
                              .run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <Underline className="size-3.5 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("strike") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() =>
                            messageEditor?.chain().focus().toggleStrike().run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <Strikethrough className="size-3.5 text-foreground" />
                        </Button>
                        <div className="h-4 w-px bg-border mx-0.5" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("bulletList") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() =>
                            messageEditor
                              ?.chain()
                              .focus()
                              .toggleBulletList()
                              .run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <List className="size-3.5 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("orderedList") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() =>
                            messageEditor
                              ?.chain()
                              .focus()
                              .toggleOrderedList()
                              .run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <ListOrdered className="size-3.5 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-muted"
                          onClick={() =>
                            messageEditor
                              ?.chain()
                              .focus()
                              .liftListItem("listItem")
                              .run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <Indent className="size-3.5 text-foreground" />
                        </Button>
                        <div className="h-4 w-px bg-border mx-0.5" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("codeBlock") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() =>
                            messageEditor
                              ?.chain()
                              .focus()
                              .toggleCodeBlock()
                              .run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <Code className="size-3.5 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("blockquote") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() =>
                            messageEditor
                              ?.chain()
                              .focus()
                              .toggleBlockquote()
                              .run()
                          }
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <Quote className="size-3.5 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 hover:bg-muted",
                            messageEditor?.isActive("link") &&
                              "bg-muted border border-primary"
                          )}
                          onClick={() => {
                            const previousUrl =
                              messageEditor?.getAttributes("link").href;
                            const url = window.prompt(
                              "Enter URL:",
                              previousUrl
                            );
                            if (url === null) {
                              return;
                            }
                            if (url === "") {
                              messageEditor
                                ?.chain()
                                .focus()
                                .extendMarkRange("link")
                                .unsetLink()
                                .run();
                              return;
                            }
                            messageEditor
                              ?.chain()
                              .focus()
                              .extendMarkRange("link")
                              .setLink({ href: url })
                              .run();
                          }}
                          disabled={
                            !messageEditor ||
                            (isClient && activeChatTab === "team")
                          }
                        >
                          <LinkIcon className="size-3.5 text-foreground" />
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("bold") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() =>
                        messageEditor?.chain().focus().toggleBold().run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <Bold className="size-3.5 text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("italic") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() =>
                        messageEditor?.chain().focus().toggleItalic().run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <Italic className="size-3.5 text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("underline") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() =>
                        messageEditor?.chain().focus().toggleUnderline().run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <Underline className="size-3.5 text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("strike") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() =>
                        messageEditor?.chain().focus().toggleStrike().run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <Strikethrough className="size-3.5 text-foreground" />
                    </Button>
                    <div className="h-4 w-px bg-border mx-0.5" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("bulletList") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() =>
                        messageEditor?.chain().focus().toggleBulletList().run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <List className="size-3.5 text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("orderedList") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() =>
                        messageEditor?.chain().focus().toggleOrderedList().run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <ListOrdered className="size-3.5 text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-muted"
                      onClick={() =>
                        messageEditor
                          ?.chain()
                          .focus()
                          .liftListItem("listItem")
                          .run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <Indent className="size-3.5 text-foreground" />
                    </Button>
                    <div className="h-4 w-px bg-border mx-0.5" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("codeBlock") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() =>
                        messageEditor?.chain().focus().toggleCodeBlock().run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <Code className="size-3.5 text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("blockquote") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() =>
                        messageEditor?.chain().focus().toggleBlockquote().run()
                      }
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <Quote className="size-3.5 text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 hover:bg-muted",
                        messageEditor?.isActive("link") &&
                          "bg-muted border border-primary"
                      )}
                      onClick={() => {
                        const previousUrl =
                          messageEditor?.getAttributes("link").href;
                        const url = window.prompt("Enter URL:", previousUrl);
                        if (url === null) {
                          return;
                        }
                        if (url === "") {
                          messageEditor
                            ?.chain()
                            .focus()
                            .extendMarkRange("link")
                            .unsetLink()
                            .run();
                          return;
                        }
                        messageEditor
                          ?.chain()
                          .focus()
                          .extendMarkRange("link")
                          .setLink({ href: url })
                          .run();
                      }}
                      disabled={
                        !messageEditor || (isClient && activeChatTab === "team")
                      }
                    >
                      <LinkIcon className="size-3.5 text-foreground" />
                    </Button>
                  </div>
                )}

                {/* Comment Button */}
                <Button
                  onClick={handleSend}
                  disabled={
                    !messageEditor ||
                    !hasEditorContent ||
                    (isClient && activeChatTab === "team")
                  }
                  className="h-[34px] px-[18px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium">Comment</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );

    // For page variant, use a div wrapper instead of FooterComponent
    if (variant === "page") {
      return (
        <div className="flex flex-col border-t p-4 md:p-6 pt-0 gap-0 bg-background">
          {footerContent}
        </div>
      );
    }

    // For sheet and dialog variants, use FooterComponent
    return (
      <FooterComponent className="flex flex-col! border-t p-4 md:p-6 pt-0 gap-0">
        {footerContent}
      </FooterComponent>
    );
  };

  // Render main content (shared between Sheet and Dialog)
  const renderContent = () => (
    <>
      <div
        ref={scrollContainerRef}
        className={cn(
          "h-full overflow-y-auto",
          variant === "dialog"
            ? "max-h-[calc(90vh-200px)]"
            : variant === "page"
            ? "h-full"
            : "flex-1"
        )}
      >
        <Tabs defaultValue="task" className="gap-0 size-full px-4 md:px-8">
          <TabsList className="grid w-full grid-cols-2 mt-6">
            <TabsTrigger
              value="task"
              onClick={() => setActiveTab("discussion")}
              className="flex items-center gap-2 cursor-pointer"
            >
              Task
            </TabsTrigger>
            <TabsTrigger
              value="media"
              onClick={() => setActiveTab("media")}
              className="flex items-center gap-2 cursor-pointer"
            >
              Media
            </TabsTrigger>
          </TabsList>
          <TabsContent value="task" className="mt-0">
            <div className="py-6 space-y-6">
              {/* Task Fields Grid */}
              <div className="grid grid-cols-[minmax(0,140px)_1fr] gap-y-3.5">
                {/* Address */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Address
                </div>
                <div className="text-sm font-medium text-foreground">
                  {job?.propertyAddress || "—"}
                </div>

                {/* Customer */}
                {!isAgentUser && (
                  <>
                    <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                      Customer
                    </div>
                    <div className="text-sm text-foreground flex items-center gap-2 flex-wrap">
                      {customerDisplayName !== "Unassigned" ? (
                        renderAssigneeBadge(customerDisplayName)
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-transparent border-2 border-secondary border-dashed"></AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>Unassigned</TooltipContent>
                        </Tooltip>
                      )}
                      {canAssignCustomer && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="muted"
                              size="sm"
                              className="h-7 rounded-full"
                              disabled={loadingAssignments}
                            >
                              {assignedCustomer ? "Change" : "Assign Customer"}
                              <ChevronDown className="size-3.5 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="w-72 max-h-[300px] overflow-y-auto p-0"
                          >
                            <div className="px-2 py-2 sticky top-0 bg-background z-10">
                              <Input
                                placeholder="Search customers..."
                                value={customerSearch}
                                onChange={(e) =>
                                  setCustomerSearch(e.target.value)
                                }
                                autoFocus
                              />
                            </div>
                            <DropdownMenuSeparator className="mb-0" />
                            {filteredCustomers.map((customer) => (
                              <DropdownMenuItem
                                key={customer.id}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleAssignCustomerInline(customer.id);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-muted">
                                    {getInitials(customer.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {customer.name}
                                  </span>
                                  {customer.email && (
                                    <span className="text-xs text-muted-foreground">
                                      {customer.email}
                                    </span>
                                  )}
                                </div>
                              </DropdownMenuItem>
                            ))}
                            {filteredCustomers.length === 0 && (
                              <DropdownMenuItem disabled>
                                No customers found
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </>
                )}

                {/* Project Manager Assigned */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  PM Assigned
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {projectManagerDisplayName !== "Unassigned" ? (
                    renderAssigneeBadge(
                      projectManagerDisplayName,
                      projectManagerDisplayAvatar
                    )
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-transparent border-2 border-secondary border-dashed"></AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>Unassigned</TooltipContent>
                    </Tooltip>
                  )}
                  {canAssignProjectManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="muted"
                          size="sm"
                          className="h-7 rounded-full"
                          disabled={loadingAssignments}
                        >
                          {assignedProjectManager
                            ? "Change"
                            : "Assign Project Manager"}
                          <ChevronDown className="size-3.5 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-72 max-h-[300px] overflow-y-auto p-0"
                      >
                        <div className="px-2 py-2 sticky top-0 bg-background z-10">
                          <Input
                            placeholder="Search project managers..."
                            value={pmSearch}
                            onChange={(e) => setPmSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <DropdownMenuSeparator className="mb-0" />
                        {filteredProjectManagers.map((member) => {
                          const userId = member.user?.id || member.userId;
                          const name =
                            member.user?.name ||
                            member.personalOrg?.legalName ||
                            member.user?.email ||
                            "Assigned";
                          const avatar = member.user?.avatarUrl;
                          return (
                            <DropdownMenuItem
                              key={member.id}
                              onSelect={(event) => {
                                event.preventDefault();
                                if (userId) {
                                  handleAssignProjectManagerInline(userId);
                                }
                              }}
                              className="flex items-center gap-2"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={avatar} alt={name} />
                                <AvatarFallback className="text-xs bg-muted">
                                  {getInitials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {name}
                                </span>
                                {member.user?.email && (
                                  <span className="text-xs text-muted-foreground">
                                    {member.user.email}
                                  </span>
                                )}
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                        {filteredProjectManagers.length === 0 && (
                          <DropdownMenuItem disabled>
                            No project managers available
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Technician Assigned */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Tech Assigned
                </div>
                <div className="flex items-center gap-2">
                  {/* Technician Assigned */}
                  {technician ? (
                    renderAssigneeBadge(technician.name, technician.avatarUrl)
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-transparent border-2 border-secondary border-dashed"></AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>Unassigned</TooltipContent>
                    </Tooltip>
                  )}
                  {/* Change Technician */}
                  {canAssignTechnicianOrEditor &&
                    technician &&
                    onChangeTechnician &&
                    (job?.status === "assigned" ||
                      job?.status === "in_progress") && (
                      <Button
                        onClick={onChangeTechnician}
                        variant="muted"
                        size="sm"
                        className="h-7 rounded-full"
                      >
                        <Edit className="size-3.5 mr-1.5" />
                        Change
                      </Button>
                    )}

                  {/* Assign Technician */}
                  {canAssignTechnicianOrEditor &&
                    onAssignTechnician &&
                    !technician && (
                      <Button
                        onClick={onAssignTechnician}
                        variant="muted"
                        size="sm"
                        className="h-7 rounded-full"
                      >
                        <span>Assign Technician</span>
                        <MapIcon className="size-3.5 ml-2" />
                      </Button>
                    )}
                </div>

                {/* Editor Assigned */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Editor Assigned
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {editorDisplayName !== "Unassigned" ? (
                    renderAssigneeBadge(editorDisplayName, editorDisplayAvatar)
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-transparent border-2 border-secondary border-dashed"></AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>Unassigned</TooltipContent>
                    </Tooltip>
                  )}
                  {canAssignTechnicianOrEditor && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="muted"
                          size="sm"
                          className="h-7 rounded-full"
                          disabled={loadingAssignments}
                        >
                          {assignedEditor ? (
                            "Change"
                          ) : (
                            <>
                              <span>Assign Editor</span>
                              <ChevronDown className="size-3.5 ml-2" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-72 max-h-[300px] overflow-y-auto p-0"
                      >
                        <div className="px-2 py-2 sticky top-0 bg-background z-10">
                          <Input
                            placeholder="Search editors..."
                            value={editorSearch}
                            onChange={(e) => setEditorSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <DropdownMenuSeparator className="mb-0" />
                        {filteredEditors.map((member) => {
                          const userId = member.user?.id || member.userId;
                          const name =
                            member.user?.name ||
                            member.personalOrg?.legalName ||
                            "Unassigned";
                          const avatar = member.user?.avatarUrl;
                          return (
                            <DropdownMenuItem
                              key={member.id}
                              onSelect={(event) => {
                                event.preventDefault();
                                if (userId) {
                                  handleAssignEditorInline(userId);
                                }
                              }}
                              className="flex items-center gap-2"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={avatar} alt={name} />
                                <AvatarFallback className="text-xs bg-muted">
                                  {getInitials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {name}
                                </span>
                                {member.user?.email && (
                                  <span className="text-xs text-muted-foreground">
                                    {member.user.email}
                                  </span>
                                )}
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                        {filteredEditors.length === 0 && (
                          <DropdownMenuItem disabled>
                            No editors available
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Schedule Date */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Schedule Date
                </div>
                <div className="text-sm text-muted-foreground">
                  {job?.scheduledDate
                    ? format(new Date(job.scheduledDate), "d MMMM yyyy")
                    : "Not scheduled"}
                </div>

                {/* Status */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Status
                </div>
                <div>
                  <Badge
                    variant="flat"
                    className="flex items-center gap-1.5 mb-1 px-0"
                  >
                    <div
                      className={cn(
                        "size-1.5 rounded-full",
                        statusConfig.indicatorColor
                      )}
                    />

                    <span
                      className={cn(
                        "text-[13px] font-medium",
                        statusConfig.textColor
                      )}
                    >
                      {statusConfig.label}
                    </span>
                  </Badge>
                </div>

                {/* Tags (Media Types) */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Tags
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(job?.mediaType || []).map((type, index) => {
                    const Icon = getMediaIcon(type);

                    return (
                      <Badge key={type} variant="muted">
                        <Icon className="h-3 w-3" />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Badge>
                    );
                  })}
                </div>

                {/* Priority */}
                <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Priority
                </div>
                <div
                  className={cn(
                    "text-[13px] font-medium",
                    priorityConfig.color
                  )}
                >
                  {priorityConfig.label}
                </div>

                {/* Created By */}
                {/* <div className="text-[13px] font-medium text-muted-foreground tracking-wide">
                  Created by
                </div>
                <div className="inline-flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-muted">
                      {currentUserName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {currentUserName}
                  </span>
                </div> */}
              </div>

              {/* Tab Navigation */}
              <div className="space-y-4">
                <div className="flex items-center gap-6 border-b border-border pt-2 pb-1">
                  <Button
                    variant="ghost"
                    size={isMobile ? "icon" : "default"}
                    onClick={() => setActiveTab("description")}
                    className={cn(
                      "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                      activeTab === "description"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="size-3.5" />
                    <span className="hidden md:block">Description</span>
                    {activeTab === "description" && (
                      <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size={isMobile ? "icon" : "default"}
                    onClick={() => setActiveTab("discussion")}
                    className={cn(
                      "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                      activeTab === "discussion"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="size-3.5" />
                    <span className="hidden md:block">Discussion</span>
                    {activeTab === "discussion" && (
                      <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </Button>
                  {/* <Button
                    variant="ghost"
                    size={isMobile ? "icon" : "default"}
                    onClick={() => setActiveTab("attachments")}
                    className={cn(
                      "relative h-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                      activeTab === "attachments"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Paperclip className="size-3.5" />
                    <span className="hidden md:block">Attachments</span>
                    {activeTab === "attachments" && (
                      <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </Button> */}
                </div>
              </div>

              {/* Tab Content */}
              <div className="pt-4 space-y-4">
                {activeTab === "description" && (
                  <div className="space-y-4">
                    <div>
                      <H4 className="text-sm font-semibold text-muted-foreground mb-2">
                        Location
                      </H4>
                      <P className="text-sm">{job?.propertyAddress || "—"}</P>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <H4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date
                        </H4>
                        <P className="text-sm">
                          {job?.scheduledDate
                            ? (() => {
                                // Parse date string as local date to avoid timezone shifts
                                const [year, month, day] = job.scheduledDate
                                  .split("-")
                                  .map(Number);
                                const date = new Date(year, month - 1, day);
                                return format(date, "MMM d, yyyy");
                              })()
                            : "Not scheduled"}
                        </P>
                      </div>
                      <div>
                        <H4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time
                        </H4>
                        <P className="text-sm">
                          {job?.scheduledTime && job?.estimatedDuration
                            ? (() => {
                                const duration = job.estimatedDuration || 60;
                                // Parse scheduled date and time in local timezone
                                const [year, month, day] = job.scheduledDate
                                  .split("-")
                                  .map(Number);
                                const [hours, minutes] = job.scheduledTime
                                  .split(":")
                                  .map(Number);
                                const scheduledDateTime = new Date(
                                  year,
                                  month - 1,
                                  day,
                                  hours || 0,
                                  minutes || 0,
                                  0,
                                  0
                                );
                                const endDateTime = new Date(
                                  scheduledDateTime.getTime() +
                                    duration * 60 * 1000
                                );

                                // Get timezone abbreviation
                                const timeZone =
                                  Intl.DateTimeFormat().resolvedOptions()
                                    .timeZone;
                                const timeZoneName =
                                  new Date()
                                    .toLocaleTimeString("en-US", {
                                      timeZoneName: "short",
                                    })
                                    .split(" ")
                                    .pop() || "";

                                return `${format(
                                  scheduledDateTime,
                                  "h:mm a"
                                )} - ${format(
                                  endDateTime,
                                  "h:mm a"
                                )} ${timeZoneName}`;
                              })()
                            : job?.scheduledTime || "Not scheduled"}
                        </P>
                      </div>
                    </div>
                    {job?.requirements && (
                      <>
                        <Separator />
                        <div>
                          <H4 className="text-sm font-semibold text-muted-foreground mb-2">
                            Requirements
                          </H4>
                          <P className="text-sm whitespace-pre-wrap">
                            {job.requirements}
                          </P>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "discussion" && (
                  <div className="flex flex-col gap-4">
                    {/* Chat Content */}
                    {activeChatTab === "client" ? (
                      <ScrollArea className="flex-1 pr-4 min-h-[400px]">
                        <div className="space-y-4">
                          {clientMessages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              {isAgentUser
                                ? "No messages yet"
                                : "No messages in customer chat yet"}
                            </div>
                          ) : (
                            clientThreaded.map((message: any) =>
                              renderMessage(message, 0)
                            )
                          )}
                        </div>
                      </ScrollArea>
                    ) : (
                      <ScrollArea className="flex-1 pr-4 min-h-[400px]">
                        <div className="space-y-4">
                          {teamMessages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No messages in team chat yet
                            </div>
                          ) : (
                            teamThreaded.map((message: any) =>
                              renderMessage(message, 0)
                            )
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                {activeTab === "attachments" && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No attachments yet
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="media" className="mt-0">
            <div className="py-6">
              {isLoadingMedia ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading media...
                </div>
              ) : isAgentUser && !hasAnyMedia ? (
                <div className="text-sm text-muted-foreground text-center py-12">
                  No media has been uploaded yet. You’ll see photos, videos, and
                  files here once they’re added.
                </div>
              ) : (
                <Accordion type="multiple" className="w-full space-y-2">
                  {/* Images Section */}
                  {(!isAgentUser || getMediaByCategory("image").length > 0) && (
                    <AccordionItem
                      value="images"
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Images</span>
                          {getMediaByCategory("image").length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {getMediaByCategory("image").length}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {renderMediaCategory("image", imageInputRef)}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Videos Section */}
                  {(!isAgentUser || getMediaByCategory("video").length > 0) && (
                    <AccordionItem
                      value="videos"
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Video className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Videos</span>
                          {getMediaByCategory("video").length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {getMediaByCategory("video").length}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {renderMediaCategory("video", videoInputRef)}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Floor Plans Section */}
                  {(!isAgentUser ||
                    getMediaByCategory("floor-plan").length > 0) && (
                    <AccordionItem
                      value="floor-plans"
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Floor Plans</span>
                          {getMediaByCategory("floor-plan").length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {getMediaByCategory("floor-plan").length}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {renderMediaCategory("floor-plan", floorPlanInputRef)}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* 3D Content Section */}
                  {(!isAgentUser ||
                    getMediaByCategory("3d-content").length > 0) && (
                    <AccordionItem
                      value="3d-content"
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Box className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">3D Content</span>
                          {getMediaByCategory("3d-content").length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {getMediaByCategory("3d-content").length}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {renderMediaCategory("3d-content", fileInputRef)}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Files Section */}
                  {(!isAgentUser || getMediaByCategory("file").length > 0) && (
                    <AccordionItem
                      value="files"
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <File className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Files</span>
                          {getMediaByCategory("file").length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {getMediaByCategory("file").length}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {renderMediaCategory("file", fileInputRef)}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );

  const mainContent = job ? (
    variant === "page" ? (
      <div className="size-full flex flex-col overflow-hidden h-[calc(100vh-var(--header-h))]">
        <div className="border-b flex-shrink-0">{renderHeader(SheetTitle)}</div>
        <div className="flex-1 overflow-hidden">{renderContent()}</div>
        {activeTab === "discussion" && (
          <div className="flex-shrink-0">{renderFooter(() => null)}</div>
        )}
      </div>
    ) : variant === "dialog" ? (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="md:min-w-[90vw] min-w-[calc(100vw-1rem)] md:max-w-[90vw] md:h-[90vh] h-[calc(100vh-1rem)] md:max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden">
          <DialogTitle className="sr-only">
            {job.propertyAddress} - {job.clientName}
          </DialogTitle>
          <DialogHeader className="border-b">
            {renderHeader(DialogTitle)}
          </DialogHeader>
          {renderContent()}
          {activeTab === "discussion" && renderFooter(DialogFooter)}
        </DialogContent>
      </Dialog>
    ) : (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[40vw] md:min-w-[600px] flex flex-col p-0 gap-0"
        >
          <SheetTitle className="sr-only">
            {job.propertyAddress} - {job.clientName}
          </SheetTitle>
          <SheetHeader className="border-b">
            {renderHeader(SheetTitle)}
          </SheetHeader>
          {renderContent()}
          {activeTab === "discussion" && renderFooter(SheetFooter)}
        </SheetContent>
      </Sheet>
    )
  ) : null;

  return (
    <>
      {/* Delete Project Confirmation Dialog */}
      <AlertDialog
        open={deleteProjectDialogOpen}
        onOpenChange={setDeleteProjectDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the job and its data. Are you sure
              you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteProjectDialogOpen(false)}
              disabled={isDeletingProject}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingProject}
            >
              {isDeletingProject && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Message Confirmation Dialog */}
      <AlertDialog
        open={deletingMessageId !== null}
        onOpenChange={(open) => !open && handleDeleteCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMessageId &&
                (() => {
                  // Check if this message has replies
                  const hasReplies = messages.some(
                    (m) => m.threadId === deletingMessageId
                  );
                  return hasReplies
                    ? "This message has replies. Only the message will be deleted, replies will remain."
                    : "Are you sure you want to delete this message? This action cannot be undone.";
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cloud Storage Integration Dialog */}
      <AlertDialog
        open={cloudStorageDialog.open}
        onOpenChange={(open) => setCloudStorageDialog({ open, service: "" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cloudStorageDialog.service} Integration
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cloudStorageDialog.service} integration is coming soon! This
              feature will allow you to directly attach files from your{" "}
              {cloudStorageDialog.service} account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setCloudStorageDialog({ open: false, service: "" });
                setConnectingService(null);
              }}
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mainContent}
    </>
  );
}
