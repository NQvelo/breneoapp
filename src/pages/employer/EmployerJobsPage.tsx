import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Briefcase, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployerJobs,
  type EmployerJob,
} from "@/api/employer/jobsApi";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EmployerJobsPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchEmployerJobs();
      setJobs(list);
    } catch {
      toast.error("Could not load jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Your jobs
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage job postings for your company
            </p>
          </div>
          <Button
            onClick={() =>
              navigate(getLocalizedPath("/employer/jobs/add", language))
            }
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Post a new job
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                Loading…
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                <Button
                  onClick={() =>
                    navigate(getLocalizedPath("/employer/jobs/add", language))
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post a new job
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Location
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Type
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id || job.title}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {job.title || "Untitled"}
                          <div className="md:hidden text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {job.location || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {job.location || "—"}
                          {job.remote ? " · Remote" : ""}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {job.employment_type ? (
                            <Badge variant="secondary" className="font-normal">
                              {job.employment_type}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {job.id ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  getLocalizedPath(
                                    `/employer/jobs/edit/${job.id}`,
                                    language,
                                  ),
                                )
                              }
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
