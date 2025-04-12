"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useFirebase } from "@/lib/firebase-context";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  UserCog,
  Trash2,
  Shield,
  ShieldOff,
  Loader2,
  Filter,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAdmin: boolean;
  createdAt: any;
  lastLogin?: any;
  enrollments?: number;
  submissions?: number;
  hackathons?: string[];
  hackathonDetails?: Hackathon[];
  // Add any other fields that might exist in your Firestore documents
}

interface Hackathon {
  id: string;
  name: string;
  startDate: any;
  endDate: any;
}

type UserFilter = "all" | "admins" | "hackathon";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [selectedHackathon, setSelectedHackathon] = useState<string | null>(
    null
  );
  const [showHackathonDropdown, setShowHackathonDropdown] = useState(false);

  const { user } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const checkAdmin = async () => {
      if (!db || !user) return;

      try {
        const userDoc = await getDocs(
          query(collection(db, "users"), where("uid", "==", user.uid))
        );
        if (!userDoc.empty && userDoc.docs[0].data().isAdmin) {
          setIsAdmin(true);
          const hackathonsData = await fetchHackathons();
          const allusers = await fetchUsers(hackathonsData);

          // Add this line to update the users state
          setUsers(allusers || []);
          setFilteredUsers(allusers || []);
          setLoading(false);

          console.log("allusers", allusers);
        } else {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You do not have permission to access the admin panel",
          });
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push("/");
      }
    };

    const fetchHackathons = async () => {
      if (!db) return;

      try {
        const hackathonsCollection = collection(db, "hackathons");
        const hackathonsSnapshot = await getDocs(hackathonsCollection);

        const hackathonsData = hackathonsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.title || "Unnamed Hackathon", // Ensure name exists
            startDate: data.startDate,
            endDate: data.endDate,
          } as Hackathon;
        });

        setHackathons(hackathonsData);
        return hackathonsData; // Return the data for use in fetchUsers
      } catch (error) {
        console.error("Error fetching hackathons:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load hackathons data",
        });
        return [];
      }
    };

    const fetchUsers = async (hackathonsData: Hackathon[] = []) => {
      if (!db) return;

      try {
        const usersCollection = collection(db, "users");

        const usersQuery = query(usersCollection, orderBy("createdAt", "desc"));
        const usersSnapshot = await getDocs(usersQuery);

        const usersData = await Promise.all(
          usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data() as User; // Explicitly type the data

            const enrollmentsQuery = query(
              collection(db, "enrollments"),
              where("userId", "==", userData.uid)
            );
            const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

            const hackathonIds = enrollmentsSnapshot.docs.map(
              (doc) => doc.data().hackathonId
            );

            const submissionsQuery = query(
              collection(db, "submissions"),
              where("userId", "==", userData.uid)
            );
            const submissionsSnapshot = await getDocs(submissionsQuery);

            const hackathonDetails = await Promise.all(
              hackathonIds.map(async (hackathonId) => {
                const hackathonDocRef = doc(db, "hackathons", hackathonId);
                const hackathonDocSnap = await getDoc(hackathonDocRef);

                if (hackathonDocSnap.exists()) {
                  const data = hackathonDocSnap.data() as Hackathon;

                  

                  return {
                    id: hackathonDocSnap.id,
                    name: data.name,
                    startDate: data.startDate,
                    endDate: data.endDate,
                  };
                }

                return null;
              })
            );

            // Create a properly typed user object
            const user: User = {
              id: userDoc.id,
              uid: userData.uid,
              email: userData.email,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              isAdmin: userData.isAdmin,
              createdAt: userData.createdAt,
              lastLogin: userData.lastLogin,
              enrollments: enrollmentsSnapshot.size,
              submissions: submissionsSnapshot.size,
              hackathons: hackathonIds,
              hackathonDetails: hackathonDetails.filter(Boolean) as Hackathon[],
            };

            return user;
          })
        );

        return usersData;

        // Rest of your code...
      } catch (error) {
        console.error("something wrong", error);
      }
    };

    checkAdmin();
  }, [db, user, router, toast]);

  useEffect(() => {
    // First filter by user type
    let filtered = users;

    if (userFilter === "admins") {
      filtered = users.filter((user) => user.isAdmin);
    } else if (userFilter === "hackathon") {
      filtered = users.filter((user) => (user.enrollments || 0) > 0);
    }

    // Then filter by specific hackathon if selected
    if (selectedHackathon) {
      filtered = filtered.filter(
        (user) => user.hackathons && user.hackathons.includes(selectedHackathon)
      );
    }

    // Then filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.displayName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, users, userFilter, selectedHackathon]);

  const handleToggleAdmin = async (
    userId: string,
    isCurrentlyAdmin: boolean
  ) => {
    if (!db) return;

    setProcessingUser(userId);

    try {
      await updateDoc(doc(db, "users", userId), {
        isAdmin: !isCurrentlyAdmin,
      });

      toast({
        title: "Success",
        description: `User ${
          isCurrentlyAdmin ? "removed from" : "added to"
        } admin role`,
      });

      // Update local state
      setUsers(
        users.map((u) => {
          if (u.id === userId) {
            return { ...u, isAdmin: !isCurrentlyAdmin };
          }
          return u;
        })
      );
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user role",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string, userUid: string) => {
    if (!db) return;

    setProcessingUser(userId);

    try {
      // Delete user document
      await deleteDoc(doc(db, "users", userId));

      // In a real app, you would also:
      // 1. Delete user from Firebase Auth
      // 2. Delete or reassign user's enrollments, submissions, etc.

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      // Update local state
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete user",
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const exportUsers = (format: "csv" | "json") => {
    let content: string;
    let filename: string;
    let type: string;

    if (format === "csv") {
      // Create CSV content
      const headers = [
        "Name",
        "Email",
        "Admin",
        "Created At",
        "Enrollments",
        "Submissions",
      ];
      const rows = filteredUsers.map((user) => [
        user.displayName || "Unknown",
        user.email || "No email",
        user.isAdmin ? "Yes" : "No",
        user.createdAt
          ? new Date(user.createdAt.toDate()).toLocaleString()
          : "Unknown",
        user.enrollments?.toString() || "0",
        user.submissions?.toString() || "0",
      ]);

      content = [headers, ...rows].map((row) => row.join(",")).join("\n");
      filename = `geekcode_users_${new Date().toISOString().split("T")[0]}.csv`;
      type = "text/csv";
    } else {
      // Create JSON content
      const data = filteredUsers.map((user) => ({
        name: user.displayName,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
          ? new Date(user.createdAt.toDate()).toISOString()
          : null,
        enrollments: user.enrollments || 0,
        submissions: user.submissions || 0,
      }));

      content = JSON.stringify(data, null, 2);
      filename = `geekcode_users_${
        new Date().toISOString().split("T")[0]
      }.json`;
      type = "application/json";
    }

    // Create and download file
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUserFilterLabel = () => {
    switch (userFilter) {
      case "admins":
        return "Admin Users";
      case "hackathon":
        return "Hackathon Users";
      default:
        return "All Users";
    }
  };

  const getHackathonFilterLabel = () => {
    if (!selectedHackathon) return "All Hackathons";
    const hackathon = hackathons.find((h) => h.id === selectedHackathon);
    return hackathon ? hackathon.name : "All Hackathons";
  };

  const toggleHackathonDropdown = () => {
    setShowHackathonDropdown(!showHackathonDropdown);
  };

  const selectHackathon = (hackathonId: string | null) => {
    setSelectedHackathon(hackathonId);
    setShowHackathonDropdown(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-pulse text-xl">Loading users data...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-xl">
          Access denied. You must be an admin to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Users</h1>
          <p className="text-gray-400 mt-1">View and manage user accounts</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            
            {/* Hackathon Filter Dropdown */}
            {userFilter != "hackathon" && (
              <div className="relative">
                <Button
                  variant="outline"
                  className="border-gray-700  mt-6 hover:bg-gray-800 w-full sm:w-auto"
                  onClick={toggleHackathonDropdown}
                >
                  {getHackathonFilterLabel()}
                </Button>

                {showHackathonDropdown && (
                  <div className="absolute z-50 mt-2 w-[280px] rounded-md bg-[#1A1A1A] border border-gray-800 shadow-lg">
                    <div
                      className="flex items-center px-4 py-2 hover:bg-gray-800 cursor-pointer"
                      onClick={() => selectHackathon(null)}
                    >
                      {!selectedHackathon && <Check className="mr-2 h-4 w-4" />}
                      <span className="ml-2">All Hackathons</span>
                    </div>

                    <Separator className="my-1 bg-gray-800" />

                    {hackathons.length > 0 ? (
                      hackathons.map((hackathon) => (
                        <div
                          key={hackathon.id}
                          className="flex items-center px-4 py-2 hover:bg-gray-800 cursor-pointer"
                          onClick={() => selectHackathon(hackathon.id)}
                        >
                          {selectedHackathon === hackathon.id && (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          <span className="ml-2">{hackathon.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-400">
                        No hackathons available
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative flex items-center">
            <div className="absolute left-3 pointer-events-none">
              <Search className="text-gray-400 h-5 w-5" />
            </div>
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#121212] border-gray-800 w-full sm:w-[250px] rounded-lg h-12"
            />
          </div>

          <Tabs defaultValue="csv" className="w-[180px]">
            <TabsList className="bg-[#1A1A1A] border-gray-800">
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="p-0">
              <Button
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 w-full"
                onClick={() => exportUsers("csv")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </TabsContent>
            <TabsContent value="json" className="p-0">
              <Button
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 w-full"
                onClick={() => exportUsers("json")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "user" : "users"} found
            {userFilter !== "all" && ` (filtered: ${getUserFilterLabel()})`}
            {selectedHackathon && ` in ${getHackathonFilterLabel()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-black/30"
                >
                  <div className="flex items-center mb-4 sm:mb-0">
                    <Avatar className="h-10 w-10 mr-4 border">
                      {user.photoURL ? (
                        <AvatarImage
                          src={user.photoURL}
                          alt={user.displayName}
                        />
                      ) : null}
                      <AvatarFallback>
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="font-medium">{user.displayName}</h3>
                        {user.isAdmin && (
                          <Badge className="bg-[#00FFBF] text-black">
                            Admin
                          </Badge>
                        )}
                        {(user.enrollments || 0) > 0 && (
                          <Badge className="bg-blue-600">Hackathon User</Badge>
                        )}
                        {selectedHackathon &&
                          user.hackathons?.includes(selectedHackathon) && (
                            <Badge className="bg-purple-600">
                              {user.hackathonDetails?.find(
                                (h) => h.id === selectedHackathon
                              )?.name || getHackathonFilterLabel()}
                            </Badge>
                          )}
                      </div>
                      <p className="text-sm text-gray-400">{user.email}</p>
                      {!selectedHackathon &&
                        user.hackathonDetails &&
                        user.hackathonDetails.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.hackathonDetails.map((hackathon) => (
                              <Badge
                                key={hackathon.id}
                                className="bg-purple-600 text-xs"
                              >
                                {hackathon.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span className="mr-3">
                          Joined: {formatDate(user.createdAt)}
                        </span>
                        <span className="mr-3">
                          Hackathons: {user.enrollments || 0}
                        </span>
                        <span>Submissions: {user.submissions || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700 hover:bg-gray-800"
                      onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                      disabled={processingUser === user.id}
                    >
                      {processingUser === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.isAdmin ? (
                        <>
                          <ShieldOff className="h-4 w-4 mr-2" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Make Admin
                        </>
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={processingUser === user.id}
                        >
                          {processingUser === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1A1A1A] border-gray-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the user account and remove all associated
                            data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.id, user.uid)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <UserCog className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No Users Found</h3>
                <p className="text-gray-400">
                  {searchQuery
                    ? `No users match the search term "${searchQuery}"`
                    : userFilter !== "all"
                    ? selectedHackathon
                      ? `No ${
                          userFilter === "admins" ? "admin" : "hackathon"
                        } users found in ${getHackathonFilterLabel()}`
                      : `No ${
                          userFilter === "admins" ? "admin" : "hackathon"
                        } users found`
                    : "There are no users in the system yet."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
