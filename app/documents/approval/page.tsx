"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  FileText,
  Mail,
  MoreHorizontal,
  Search,
  Smartphone,
  User,
  Briefcase,
  Users,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Loader2,
  Check,
  X as XIcon,
  CheckCircle,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";

interface Document {
  id: number;
  timestamp: string;
  serialNo: string;
  name: string;
  documentType: string;
  category: string;
  company: string;
  tags: string[];
  personName: string;
  needsRenewal: boolean;
  renewalDate: string;
  imageUrl: string;
  email: string;
  mobile: string;
  status: string;
}

const formatDateTimeDisplay = (dateString: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    if (hours === "00" && minutes === "00" && seconds === "00") {
      const now = new Date();
      return `${day}/${month}/${year} || ${now
        .getHours()
        .toString()
        .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now
        .getSeconds()
        .toString()
        .padStart(2, "0")}`;
    }

    return `${day}/${month}/${year} || ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

const formatImageUrl = (url: string): string => {
  if (!url) return "";
  if (url.includes("uc?export=view")) return url;
  if (url.includes("drive.google.com/file/d/")) {
    const fileId = url.split("/file/d/")[1].split("/")[0];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  return url;
};

const handleDownloadDocument = (imageUrl: string, documentName: string) => {
  if (!imageUrl) {
    toast({
      title: "No image available",
      description: "This document doesn't have an image to download",
      variant: "destructive",
    });
    return;
  }

  let downloadUrl = imageUrl;

  if (imageUrl.includes("drive.google.com")) {
    const fileId = imageUrl.match(/[-\w]{25,}/)?.[0];
    if (fileId) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.setAttribute(
    "download",
    `${documentName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.jpg` ||
      "document.jpg"
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: "Download started",
    description: `Downloading ${documentName}`,
  });
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-12 w-12 text-[#7569F6] animate-spin" />
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Loading Documents
        </h3>
        <p className="text-sm text-gray-500">
          Please wait while we fetch your documents...
        </p>
      </div>
    </div>
  </div>
);

export default function ApprovalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, userRole, userName } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const [imagePopup, setImagePopup] = useState<{ open: boolean; url: string }>({
    open: false,
    url: "",
  });

  const handleViewImage = (url: string) => {
    try {
      let imageUrl = formatImageUrl(url);
      window.open(imageUrl, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not open image",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setMounted(true);

    const search = searchParams.get("search");
    if (search) {
      setSearchTerm(search);
    }

    fetchDocuments();
  }, [isLoggedIn, router, searchParams]);

const fetchDocuments = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbypGlYvVv_nxEZvWqUaUdt-H1Kx3vLhHTySwEoRR18eNCDiAucE1Tg65Tye5LcyhHAuqQ/exec?sheet=Approval%20Documents"
    );
    const data = await response.json();

    if (data.success && data.data) {
      const docs = data.data.slice(1).map((doc: any[], index: number) => ({
        id: index + 1,
        timestamp: doc[0] ? new Date(doc[0]).toISOString() : new Date().toISOString(),
        serialNo: doc[1] || "",
        name: doc[2] || "",
        documentType: doc[3] || "Personal",
        category: doc[4] || "",
        company: doc[5] || "",
        tags: doc[6] ? String(doc[6]).split(",").map((tag: string) => tag.trim()) : [],
        personName: doc[7] || "",
        needsRenewal: doc[8] === "TRUE" || doc[8] === "Yes" || false,
        renewalDate: doc[9] || "",
        imageUrl: doc[11] || "",
        email: doc[12] || "",
        mobile: doc[13] ? String(doc[13]) : "",
        status: doc[14] || "Pending",
      }));

      // Filter to only show pending documents for the current user
      const pendingDocs = docs.filter(
        (doc) => (!doc.status || doc.status.toLowerCase() === "pending") &&
                 (userRole?.toLowerCase() === "admin" || 
                  doc.personName.toLowerCase() === userName?.toLowerCase())
      );

      setDocuments(pendingDocs);
    }
  } catch (error) {
    console.error("Error fetching documents:", error);
    toast({
      title: "Error",
      description: "Failed to fetch documents",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  const filteredDocuments = documents.filter((doc) => {
    return (
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(doc.email).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(doc.mobile).toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  });

const handleApprove = async (docId: number) => {
  try {
    if (!docId) {
      throw new Error("No document ID provided");
    }

    const docToApprove = documents.find((doc) => doc.id === docId);
    if (!docToApprove) {
      throw new Error("Document not found in local data");
    }

    if (!docToApprove.serialNo || !docToApprove.timestamp) {
      throw new Error("Document is missing required identification fields");
    }

    setIsLoading(true);
    
    const response = await fetch(
      `https://script.google.com/macros/s/AKfycbypGlYvVv_nxEZvWqUaUdt-H1Kx3vLhHTySwEoRR18eNCDiAucE1Tg65Tye5LcyhHAuqQ/exec`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "approve",
          sheetName: "Approval Documents",
          serialNo: docToApprove.serialNo,
          timestamp: docToApprove.timestamp,
          role: userRole || "User"
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to approve document");
    }

    toast({
      title: "Success",
      description: `Document "${docToApprove.name}" (${docToApprove.serialNo}) has been approved`,
    });

    // Optimistically update the UI
    setDocuments(documents.filter(doc => doc.id !== docId));

  } catch (error) {
    console.error("Approval Error:", {
      docId,
      document: docToApprove,
      error
    });

    toast({
      title: "Approval Failed",
      description: error instanceof Error 
        ? error.message 
        : "An unexpected error occurred",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

const handleReject = async (docId: number) => {
  try {
    if (!docId) {
      throw new Error("No document ID provided");
    }

    const docToReject = documents.find((doc) => doc.id === docId);
    if (!docToReject) {
      throw new Error("Document not found in local data");
    }

    if (!docToReject.serialNo || !docToReject.timestamp) {
      throw new Error("Document is missing required identification fields");
    }

    setIsLoading(true);
    
    const response = await fetch(
      `https://script.google.com/macros/s/AKfycbypGlYvVv_nxEZvWqUaUdt-H1Kx3vLhHTySwEoRR18eNCDiAucE1Tg65Tye5LcyhHAuqQ/exec`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "reject",
          sheetName: "Approval Documents",
          serialNo: docToReject.serialNo,
          timestamp: docToReject.timestamp,
          role: userRole || "User"
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to reject document");
    }

    toast({
      title: "Success",
      description: `Document "${docToReject.name}" (${docToReject.serialNo}) has been rejected`,
    });

    // Optimistically update the UI
    setDocuments(documents.filter(doc => doc.id !== docId));

  } catch (error) {
    console.error("Rejection Error:", {
      docId,
      document: docToReject,
      error
    });

    toast({
      title: "Rejection Failed",
      description: error instanceof Error 
        ? error.message 
        : "An unexpected error occurred",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  if (!mounted || !isLoggedIn) {
    return <LoadingSpinner />;
  }

   return (
    <div className="p-4 sm:p-6 md:p-8 pt-16 md:pt-8 max-w-[1200px] mx-auto">
      <Toaster />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mr-2 text-[#7569F6] hover:text-[#935DF6] hover:bg-[#935DF6]/10"
          >
            <Link href="/">
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </>
            </Link>
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-[#7569F6] flex items-center">
            <CheckCircle className="h-6 w-6 mr-2 text-[#7569F6]" />
            Approval Dashboard
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search documents..."
              className="pl-8 border-gray-300 focus:border-[#7569F6] focus:ring-[#7569F6]/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            disabled={isLoading}
            className="border-[#7569F6] text-[#7569F6] hover:bg-[#7569F6]/10"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="shadow-sm border-[#7569F6]/20">
              <CardHeader className="bg-[#7569F6]/5 border-b border-[#7569F6]/20 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base md:text-lg text-[#7569F6] flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-[#7569F6] flex-shrink-0" />
                    Documents Pending Approval ({filteredDocuments.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#7569F6]/5">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="p-2 md:p-4 text-[#7569F6]">Serial No</TableHead>
                        <TableHead className="p-2 md:p-4 text-[#7569F6]">
                          Document Name
                        </TableHead>
                        <TableHead className="hidden md:table-cell p-2 md:p-4 text-[#7569F6]">
                          Category
                        </TableHead>
                        <TableHead className="hidden md:table-cell p-2 md:p-4 text-[#7569F6]">
                          Company/Dept
                        </TableHead>
                        <TableHead className="hidden md:table-cell p-2 md:p-4 text-[#7569F6]">
                          Name
                        </TableHead>
                        <TableHead className="hidden lg:table-cell p-2 md:p-4 text-[#7569F6]">
                          Renewal Date
                        </TableHead>
                        <TableHead className="hidden lg:table-cell p-2 md:p-4 text-[#7569F6]">
                          Tags
                        </TableHead>
                        <TableHead className="hidden lg:table-cell p-2 md:p-4 text-[#7569F6]">
                          Email
                        </TableHead>
                        <TableHead className="hidden lg:table-cell p-2 md:p-4 text-[#7569F6]">
                          Mobile
                        </TableHead>
                        <TableHead className="hidden lg:table-cell p-2 md:p-4 text-[#7569F6]">
                          Image
                        </TableHead>
                        <TableHead className="text-right p-2 md:p-4 text-[#7569F6]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                          <TableRow key={doc.id} className="hover:bg-[#7569F6]/5 border-[#7569F6]/10">
                            <TableCell className="p-2 md:p-4 font-mono text-sm">
                              {doc.serialNo || "-"}
                            </TableCell>
                            <TableCell className="p-2 md:p-4">
                              <div className="flex items-center min-w-0">
                                {doc.category === "Personal" ? (
                                  <User className="h-4 w-4 mr-2 text-[#7569F6] flex-shrink-0" />
                                ) : doc.category === "Company" ? (
                                  <Briefcase className="h-4 w-4 mr-2 text-[#5477F6] flex-shrink-0" />
                                ) : (
                                  <Users className="h-4 w-4 mr-2 text-[#935DF6] flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium truncate text-sm md:text-base">
                                    {doc.name}
                                  </div>
                                  <div className="md:hidden text-xs text-gray-500 truncate">
                                    {doc.serialNo} • {doc.category} •{" "}
                                    {doc.company}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden md:table-cell p-2 md:p-4">
                              <Badge
                                className={`${
                                  doc.category === "Personal"
                                    ? "bg-[#7569F6]/10 text-[#7569F6]"
                                    : doc.category === "Company"
                                    ? "bg-[#5477F6]/10 text-[#5477F6]"
                                    : "bg-[#935DF6]/10 text-[#935DF6]"
                                }`}
                              >
                                {doc.category || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-2 md:p-4">
                              {doc.company || "-"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell p-2 md:p-4">
                              {doc.personName || "-"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell p-2 md:p-4 font-mono text-sm">
                              <Badge className="bg-[#A555F7]/10 text-[#A555F7] flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {doc.renewalDate
                                  ? new Date(
                                      doc.renewalDate
                                    ).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })
                                  : "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell p-2 md:p-4">
                              {doc.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {doc.tags.map((tag, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs border-[#7569F6]/30 text-[#7569F6]"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell p-2 md:p-4">
                              {doc.email || "-"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell p-2 md:p-4">
                              {doc.mobile || "-"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell p-2 md:p-4">
                              {doc.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewImage(doc.imageUrl)}
                                  className="text-[#5477F6] hover:underline"
                                >
                                  <ImageIcon className="h-5 w-5 mr-1" />
                                </button>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right p-2 md:p-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-[#7569F6]/10"
                                  >
                                    <MoreHorizontal className="h-4 w-4 text-[#7569F6]" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-[#7569F6]/20">
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-[#7569F6]/5"
                                    onClick={() =>
                                      handleDownloadDocument(
                                        doc.imageUrl,
                                        doc.name
                                      )
                                    }
                                  >
                                    <Download className="h-4 w-4 mr-2 text-[#7569F6]" />
                                    <span className="text-[#7569F6]">Download</span>
                                  </DropdownMenuItem>
                                  {userRole?.toLowerCase() === "admin" && (
                                    <>
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-[#7569F6]/5"
                                        onClick={() => handleApprove(doc.id)}
                                      >
                                        <Check className="h-4 w-4 mr-2 text-[#7569F6]" />
                                        <span className="text-[#7569F6]">Approve</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer hover:bg-[#7569F6]/5"
                                        onClick={() => handleReject(doc.id)}
                                      >
                                        <XIcon className="h-4 w-4 mr-2 text-[#7569F6]" />
                                        <span className="text-[#7569F6]">Reject</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={13}
                            className="text-center py-8 text-gray-500"
                          >
                            {searchTerm ? (
                              <>No documents found matching your criteria.</>
                            ) : (
                              <>
                                <div className="flex flex-col items-center justify-center py-8">
                                  <FileText className="h-12 w-12 text-gray-300 mb-4" />
                                  <p className="mb-4">
                                    No documents pending approval.
                                  </p>
                                </div>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:hidden mt-4">
            {filteredDocuments.length > 0 ? (
              <div className="space-y-3">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="shadow-sm overflow-hidden border-[#7569F6]/20">
                    <div
                      className={`p-3 border-l-4 ${
                        doc.category === "Personal"
                          ? "border-l-[#7569F6]"
                          : doc.category === "Company"
                          ? "border-l-[#5477F6]"
                          : "border-l-[#935DF6]"
                      } flex items-center justify-between bg-[#7569F6]/5`}
                    >
                      <div className="flex items-center min-w-0">
                        {doc.category === "Personal" ? (
                          <User className="h-5 w-5 mr-2 text-[#7569F6] flex-shrink-0" />
                        ) : doc.category === "Company" ? (
                          <Briefcase className="h-5 w-5 mr-2 text-[#5477F6] flex-shrink-0" />
                        ) : (
                          <Users className="h-5 w-5 mr-2 text-[#935DF6] flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate text-sm">
                            {doc.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            Serial: {doc.serialNo || "N/A"} • {doc.category}
                          </div>
                          <div className="text-xs text-gray-500 truncate font-mono">
                            {doc.timestamp
                              ? formatDateTimeDisplay(doc.timestamp)
                              : "No Date"}
                          </div>
                          {doc.email && (
                            <div className="text-xs text-gray-500 truncate">
                              {doc.email}
                            </div>
                          )}
                          {doc.mobile && (
                            <div className="text-xs text-gray-500 truncate">
                              {doc.mobile}
                            </div>
                          )}
                          {doc.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleViewImage(doc.imageUrl)}
                              className="mt-1 flex items-center text-xs text-[#5477F6]"
                            >
                              <ImageIcon className="h-3 w-3 mr-1" />
                              View Image
                            </button>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-[#7569F6]/10"
                          >
                            <MoreHorizontal className="h-4 w-4 text-[#7569F6]" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-[#7569F6]/20">
                          <DropdownMenuItem
                            className="cursor-pointer hover:bg-[#7569F6]/5"
                            onClick={() =>
                              handleDownloadDocument(doc.imageUrl, doc.name)
                            }
                          >
                            <Download className="h-4 w-4 mr-2 text-[#7569F6]" />
                            <span className="text-[#7569F6]">Download</span>
                          </DropdownMenuItem>
                          {userRole?.toLowerCase() === "admin" && (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer hover:bg-[#7569F6]/5"
                                onClick={() => handleApprove(doc.id)}
                              >
                                <Check className="h-4 w-4 mr-2 text-[#7569F6]" />
                                <span className="text-[#7569F6]">Approve</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer hover:bg-[#7569F6]/5"
                                onClick={() => handleReject(doc.id)}
                              >
                                <XIcon className="h-4 w-4 mr-2 text-[#7569F6]" />
                                <span className="text-[#7569F6]">Reject</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-sm border-[#7569F6]/20">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="mb-4 text-gray-500">
                    {searchTerm
                      ? "No documents found matching your criteria."
                      : "No documents pending approval."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
