"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  Plus,
  Share2,
  Upload,
  Clock,
  User,
  Briefcase,
  Users,
  ChevronRight,
  RefreshCw,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbypGlYvVv_nxEZvWqUaUdt-H1Kx3vLhHTySwEoRR18eNCDiAucE1Tg65Tye5LcyhHAuqQ/exec';

type Document = {
  id: string;
  name: string;
  type: string;
  documentType: 'Personal' | 'Company' | 'Director';
  date: string;
  renewalDate: string | null;
  needsRenewal: boolean;
  sharedWith: string;
  sharedMethod: string;
  sourceSheet: string;
  serialNo: string;
  imageUrl: string;
};

type DashboardStats = {
  total: number;
  recent: number;
  shared: number;
  needsRenewal: number;
  personal: number;
  company: number;
  director: number;
};

export default function Dashboard() {
  const router = useRouter()
  const { isLoggedIn, userName, userRole } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    recent: 0,
    shared: 0,
    needsRenewal: 0,
    personal: 0,
    company: 0,
    director: 0,
  })
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([])
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([])
  const [renewalDocuments, setRenewalDocuments] = useState<Document[]>([])
  const [currentDate, setCurrentDate] = useState("")
  const [greeting, setGreeting] = useState("Good morning")

const fetchDashboardData = async (currentUserName: string, isAdmin: boolean) => {
  setIsLoading(true);
  try {
    const [documentsResponse, renewalsResponse, sharedResponse] = await Promise.all([
      fetch(`${SHEET_API_URL}?sheet=Documents`),
      fetch(`${SHEET_API_URL}?sheet=Updated Renewal`),
      fetch(`${SHEET_API_URL}?sheet=Shared Documents`),
    ]);

    const [documentsData, renewalsData, sharedData] = await Promise.all([
      documentsResponse.json(),
      renewalsResponse.json(),
      sharedResponse.json(),
    ]);

    let allDocuments: Document[] = [];
    let statsData: DashboardStats = {
      total: 0,
      recent: 0,
      shared: 0,
      needsRenewal: 0,
      personal: 0,
      company: 0,
      director: 0,
    };

    // Process Shared Documents
    let sharedDocumentsCount = 0;
    let recentSharedDocuments: Document[] = [];
    
    if (sharedData.success && sharedData.data && sharedData.data.length > 1) {
      // Filter shared documents based on user role
      const filteredSharedData = isAdmin 
        ? sharedData.data.slice(1) // Admin gets all shared documents
        : sharedData.data.slice(1).filter((row: any[]) => {
            const sharedWithName = row[2]?.toString().trim(); // Column C (index 2) contains the name
            return sharedWithName && sharedWithName.toLowerCase() === currentUserName.toLowerCase();
          });
      
      sharedDocumentsCount = filteredSharedData.length;
      
      recentSharedDocuments = filteredSharedData.map((row: any[], index: number) => ({
        id: `shared-${index}-${row[6] || index}`,
        name: row[3] || "", // Column D (index 3)
        type: row[5] || "", // Column F (index 5)
        documentType: row[4] as 'Personal' | 'Company' | 'Director' || "Personal", // Column E (index 4)
        date: row[0] || new Date().toISOString(), // Column A (index 0)
        renewalDate: null,
        needsRenewal: false,
        sharedWith: row[1] || "", // Column B (index 1)
        sharedMethod: row[9] === "Email" ? "email" : "whatsapp", // Column J (index 9)
        sourceSheet: "Shared Documents",
        serialNo: row[6] || "", // Column G (index 6)
        imageUrl: row[7] || "" // Column H (index 7)
      })).slice(0, 5);
    }

    // Rest of your existing code for processing Documents and Renewals...
    // Process Documents
    if (documentsData.success && documentsData.data) {
      const docs = documentsData.data.slice(1)
        .filter((doc: any[]) => {
          if (isAdmin) return true;
          const docUserName = doc[7]?.toString().trim();
          return docUserName && docUserName.toLowerCase() === currentUserName.toLowerCase();
        })
        .map((doc: any[], index: number) => {
          const serialNo = doc[1] || "";
          const docType = doc[4] || "Personal";
          const needsRenewal = (doc[8] === "TRUE" || doc[8] === "Yes" || false);
          
          if (docType === "Personal") statsData.personal++;
          if (docType === "Company") statsData.company++;
          if (docType === "Director") statsData.director++;
          if (needsRenewal) statsData.needsRenewal++;

          return {
            id: `doc-${index}-${serialNo}`,
            name: doc[2] || "",
            type: doc[4] || "",
            documentType: docType as 'Personal' | 'Company' | 'Director',
            date: doc[0] || new Date().toISOString(),
            renewalDate: doc[9] || null,
            needsRenewal,
            sharedWith: doc[12] || doc[13] || "",
            sharedMethod: doc[12] ? "email" : "whatsapp",
            sourceSheet: "Documents",
            serialNo,
            imageUrl: doc[11] || ""
          };
        });
      
      allDocuments = [...allDocuments, ...docs];
    }

    // Process Renewals
    if (renewalsData.success && renewalsData.data) {
      const renewalDocs = renewalsData.data.slice(1)
        .filter((doc: any[]) => {
          if (isAdmin) return true;
          const docUserName = doc[10]?.toString().trim();
          return docUserName && docUserName.toLowerCase() === currentUserName.toLowerCase();
        })
        .map((doc: any[], index: number) => {
          const serialNo = doc[1] || "";
          const docType = doc[5] || "Personal";
          const renewalInfo = doc[9] || "";
          let needsRenewal = false;
          let renewalDate = null;

          if (renewalInfo) {
            const parsedDate = new Date(renewalInfo);
            if (!isNaN(parsedDate.getTime())) {
              needsRenewal = true;
              renewalDate = renewalInfo;
            } else {
              needsRenewal = renewalInfo === "TRUE" || 
                            renewalInfo === "Yes" || 
                            renewalInfo.toLowerCase().includes("renew");
            }
          }

          if (docType === "Personal") statsData.personal++;
          if (docType === "Company") statsData.company++;
          if (docType === "Director") statsData.director++;
          if (needsRenewal) statsData.needsRenewal++;

          return {
            id: `renewal-${index}-${serialNo}`,
            name: doc[3] || "",
            type: doc[5] || "",
            documentType: docType as 'Personal' | 'Company' | 'Director',
            date: doc[0] || new Date().toISOString(),
            renewalDate,
            needsRenewal,
            sharedWith: doc[11] || doc[12] || "",
            sharedMethod: doc[11] ? "email" : "whatsapp",
            sourceSheet: "Updated Renewal",
            serialNo,
            imageUrl: doc[13] || ""
          };
        })
        .filter(Boolean);

      allDocuments = [...allDocuments, ...renewalDocs];
    }

    // Calculate stats
    statsData.total = allDocuments.length;
    statsData.shared = sharedDocumentsCount;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    statsData.recent = allDocuments.filter(doc => {
      const docDate = new Date(doc.date);
      return docDate >= oneWeekAgo;
    }).length;

    // Sort documents
    allDocuments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const recentDocs = allDocuments.slice(0, 10);
const renewalDocs = allDocuments
  .filter(doc => doc.needsRenewal)
  .slice(0, 5);

  if (recentSharedDocuments.length > 0) {
  recentSharedDocuments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

return {
  stats: statsData,
  recentDocuments: recentDocs,
  sharedDocuments: recentSharedDocuments,
  renewalDocuments: renewalDocs,
};

    return {
      stats: statsData,
      recentDocuments: recentDocs,
      sharedDocuments: recentSharedDocuments,
      renewalDocuments: renewalDocs,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const setGreetingAndDate = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    let newGreeting = "Good morning";
    if (currentHour >= 12 && currentHour < 18) {
      newGreeting = "Good afternoon";
    } else if (currentHour >= 18) {
      newGreeting = "Good evening";
    }
    
    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    setGreeting(newGreeting);
    setCurrentDate(formattedDate);
  }

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const isAdmin = userRole?.toLowerCase() === "admin";
      const dashboardData = await fetchDashboardData(userName || "", isAdmin);
      
      const formattedRecentDocs = dashboardData.recentDocuments.map(doc => ({
        ...doc,
        date: formatDate(doc.date),
        renewalDate: doc.renewalDate ? formatDate(doc.renewalDate) : null
      }));
      
      const formattedSharedDocs = dashboardData.sharedDocuments.map(doc => ({
        ...doc,
        date: formatDate(doc.date),
        renewalDate: doc.renewalDate ? formatDate(doc.renewalDate) : null
      }));
      
      const formattedRenewalDocs = dashboardData.renewalDocuments.map(doc => ({
        ...doc,
        date: formatDate(doc.date),
        renewalDate: doc.renewalDate ? formatDate(doc.renewalDate) : null
      }));
      
      setStats(dashboardData.stats);
      setRecentDocuments(formattedRecentDocs);
      setSharedDocuments(formattedSharedDocs);
      setRenewalDocuments(formattedRenewalDocs);
      setGreetingAndDate();
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    refreshData();
  }, [isLoggedIn, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  const totalDocs = stats.total || 1
  const personalPercentage = Math.round((stats.personal / totalDocs) * 100)
  const companyPercentage = Math.round((stats.company / totalDocs) * 100)
  const directorPercentage = Math.round((stats.director / totalDocs) * 100)
  const renewalPercentage = Math.round((stats.needsRenewal / totalDocs) * 100)

return (
    <div className="p-4 sm:p-6 md:p-8 pt-16 md:pt-8 max-w-[1600px] mx-auto">
      {/* Greeting Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-purple-800">
              {greeting}{userName && `, ${userName}`}!
              {/* {userRole && (
                <span className="ml-2 text-lg font-normal text-purple-600">
                  ({userRole})
                </span>
              )} */}
            </h1>
            <p className="text-gray-500 text-sm md:text-base">{currentDate}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Total Documents</p>
                <h3 className="text-3xl font-bold text-purple-800">{stats.total}</h3>
              </div>
              <div className="h-12 w-12 bg-purple-200 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-700" />
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/documents"
                className="text-xs font-medium text-purple-700 flex items-center hover:underline"
              >
                View all documents <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-pink-600 mb-1">Recent Uploads</p>
                <h3 className="text-3xl font-bold text-pink-800">{stats.recent}</h3>
              </div>
              <div className="h-12 w-12 bg-pink-200 rounded-full flex items-center justify-center">
                <Upload className="h-6 w-6 text-pink-700" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-pink-600">In the last 7 days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600 mb-1">Shared Documents</p>
                <h3 className="text-3xl font-bold text-indigo-800">{stats.shared}</h3>
              </div>
              <div className="h-12 w-12 bg-indigo-200 rounded-full flex items-center justify-center">
                <Share2 className="h-6 w-6 text-indigo-700" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/shared" className="text-xs font-medium text-indigo-700 flex items-center hover:underline">
                View shared documents <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rose-600 mb-1">Need Renewal</p>
                <h3 className="text-3xl font-bold text-rose-800">{stats.needsRenewal}</h3>
              </div>
              <div className="h-12 w-12 bg-rose-200 rounded-full flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-rose-700" />
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/documents/renewal"
                className="text-xs font-medium text-rose-700 flex items-center hover:underline"
              >
                View renewal documents <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-lg md:text-xl text-purple-800 flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-purple-600" />
              Document Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center">
                    <User className="h-4 w-4 mr-1 text-purple-600" /> Personal
                  </span>
                  <span className="font-semibold">{personalPercentage}%</span>
                </div>
                <Progress
                  value={personalPercentage}
                  className="h-2 bg-gray-100"
                  indicatorClassName="bg-gradient-to-r from-purple-400 to-purple-600"
                />
                <p className="text-xs text-gray-500 mt-1">{stats.personal} documents</p>
              </div>

              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center">
                    <Briefcase className="h-4 w-4 mr-1 text-pink-600" /> Company
                  </span>
                  <span className="font-semibold">{companyPercentage}%</span>
                </div>
                <Progress
                  value={companyPercentage}
                  className="h-2 bg-gray-100"
                  indicatorClassName="bg-gradient-to-r from-pink-400 to-pink-600"
                />
                <p className="text-xs text-gray-500 mt-1">{stats.company} documents</p>
              </div>

              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center">
                    <Users className="h-4 w-4 mr-1 text-indigo-600" /> Director
                  </span>
                  <span className="font-semibold">{directorPercentage}%</span>
                </div>
                <Progress
                  value={directorPercentage}
                  className="h-2 bg-gray-100"
                  indicatorClassName="bg-gradient-to-r from-indigo-400 to-indigo-600"
                />
                <p className="text-xs text-gray-500 mt-1">{stats.director} documents</p>
              </div>

              <div className="flex flex-col space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center">
                    <RefreshCw className="h-4 w-4 mr-1 text-rose-600" /> Renewal
                  </span>
                  <span className="font-semibold">{renewalPercentage}%</span>
                </div>
                <Progress
                  value={renewalPercentage}
                  className="h-2 bg-gray-100"
                  indicatorClassName="bg-gradient-to-r from-rose-400 to-rose-600"
                />
                <p className="text-xs text-gray-500 mt-1">{stats.needsRenewal} documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg md:text-xl text-purple-800 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-purple-600" />
                Recent Activity
              </CardTitle>
              <Link href="/documents" className="text-sm text-purple-600 hover:text-purple-800 flex items-center">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[340px] overflow-y-auto">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center min-w-0">
                    <div
                      className={`mr-3 p-2 rounded-full flex-shrink-0 ${
                        doc.documentType === "Personal"
                          ? "bg-purple-100"
                          : doc.documentType === "Company"
                            ? "bg-pink-100"
                            : "bg-indigo-100"
                      }`}
                    >
                      {doc.documentType === "Personal" ? (
                        <User className="h-5 w-5 text-purple-600" />
                      ) : doc.documentType === "Company" ? (
                        <Briefcase className="h-5 w-5 text-pink-600" />
                      ) : (
                        <Users className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm md:text-base">{doc.name}</p>
                      <div className="flex items-center mt-1">
                        <Badge
                          className={`mr-2 text-xs ${
                            doc.documentType === "Personal"
                              ? "bg-purple-100 text-purple-800"
                              : doc.documentType === "Company"
                                ? "bg-pink-100 text-pink-800"
                                : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {doc.documentType}
                        </Badge>
                        <span className="text-xs text-gray-500">{doc.sharedWith}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {/* <p className="text-xs md:text-sm text-gray-500 ml-2 flex-shrink-0">{doc.date}</p> */}
                    {/* {doc.needsRenewal && (
                      <Badge className="mt-1 bg-rose-100 text-rose-800 text-xs">Needs Renewal</Badge>
                    )} */}
                  </div>
                </div>
              ))}
              {recentDocuments.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No recent documents found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg md:text-xl text-purple-800 flex items-center">
                <RefreshCw className="h-5 w-5 mr-2 text-rose-600" />
                Documents Needing Renewal
              </CardTitle>
              <Link
                href="/documents/renewal"
                className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
              >
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[340px] overflow-y-auto">
              {renewalDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center min-w-0">
                    <div
                      className={`mr-3 p-2 rounded-full flex-shrink-0 ${
                        doc.documentType === "Personal"
                          ? "bg-purple-100"
                          : doc.documentType === "Company"
                            ? "bg-pink-100"
                            : "bg-indigo-100"
                      }`}
                    >
                      {doc.documentType === "Personal" ? (
                        <User className="h-5 w-5 text-purple-600" />
                      ) : doc.documentType === "Company" ? (
                        <Briefcase className="h-5 w-5 text-pink-600" />
                      ) : (
                        <Users className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm md:text-base">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-xs bg-gray-100 text-gray-700">
                          {doc.serialNo || "No Serial"}
                        </Badge>
                        {doc.renewalDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-rose-500" />
                            <span className="text-xs text-rose-600 font-medium">
                              {doc.renewalDate}
                            </span>
                          </div>
                        ) : (
                          <Badge className="text-xs bg-rose-100 text-rose-800">
                            Needs Renewal
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {userRole?.toLowerCase() === "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                      asChild
                    >
                      <Link href={`/documents/renewal?search=${encodeURIComponent(doc.serialNo || doc.name)}`}>
                        Renew
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
              {renewalDocuments.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-purple-300" />
                  <p>No documents need renewal.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg md:text-xl text-purple-800 flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-indigo-600" />
                Recently Shared
              </CardTitle>
              <Link href="/shared" className="text-sm text-purple-600 hover:text-purple-800 flex items-center">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[340px] overflow-y-auto">
              {sharedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center min-w-0">
                    <div className="mr-3 p-2 rounded-full bg-indigo-100 flex-shrink-0">
                      <Share2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm md:text-base">{doc.name}</p>
                      <div className="flex items-center mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs mr-2 ${
                            doc.sharedMethod === "email"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {doc.sharedMethod === "email" ? "Email" : "WhatsApp"}
                        </Badge>
                        <span className="text-xs text-gray-500 truncate">
                          Shared with: {doc.sharedWith?.substring(0, 15)}
                          {doc.sharedWith && doc.sharedWith.length > 15 ? "..." : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  {userRole?.toLowerCase() === "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      asChild
                    >
                      <Link href={`/documents?search=${encodeURIComponent(doc.serialNo || doc.name)}`}>
                        Share Again
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
              {sharedDocuments.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <Share2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No shared documents found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}