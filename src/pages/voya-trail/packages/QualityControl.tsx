
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    CheckCircle,
    ChevronRight,
    Edit2,
    AlertOctagon,
    RefreshCw,
    Search
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { packagesAPI, QualityCheckItem } from '@/services/api';
import { showToast } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';

const QualityControl = () => {
    const navigate = useNavigate();
    const { canEdit } = useAuth();
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState<QualityCheckItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchQualityData();
    }, []);

    const fetchQualityData = async () => {
        try {
            setLoading(true);
            const data = await packagesAPI.getQualityCheck();
            setPackages(data);
        } catch (error) {
            showToast.error('Failed to fetch quality control data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'draft': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'archived': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getUrgencyColor = (count: number) => {
        if (count >= 5) return 'text-red-500';
        if (count >= 3) return 'text-orange-500';
        return 'text-yellow-500';
    };

    const filteredPackages = packages.filter(pkg =>
        pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen w-full flex-row overflow-hidden bg-background text-foreground font-sans antialiased">
            <Sidebar project="voya-trail" />

            <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-background/50">
                <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Voya Trail</span>
                        <ChevronRight className="h-4 w-4" />
                        <span>Packages</span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">Quality Control</span>
                    </div>

                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                <AlertOctagon className="h-8 w-8 text-primary" />
                                Quality Control
                            </h1>
                            <p className="text-muted-foreground">
                                Identify and fix missing data in your tour packages to improve quality and SEO.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={fetchQualityData}
                            disabled={loading}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Analysis
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Issues Found
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {packages.reduce((acc, curr) => acc + curr.issueCount, 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Packages with Issues
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {packages.filter(p => p.issueCount > 0).length}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Critical Issues (&gt;5)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-500">
                                    {packages.filter(p => p.issueCount >= 5).length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search Filter */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search packages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Issues Table */}
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle>Incomplete Packages</CardTitle>
                            <CardDescription>
                                Packages sorted by number of missing fields.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[300px]">Package Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Issues</TableHead>
                                            <TableHead className="w-[400px]">Missing Fields</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                                        Analyzing packages...
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredPackages.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                                        <CheckCircle className="h-8 w-8 text-green-500" />
                                                        <p>Great job! No issues found based on your search.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPackages.map((pkg) => (
                                                <TableRow key={pkg.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{pkg.title}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                Last updated: {new Date(pkg.updatedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{pkg.category}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getStatusColor(pkg.status)}>
                                                            {pkg.status || 'unknown'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={`flex items-center gap-1 font-bold ${getUrgencyColor(pkg.issueCount)}`}>
                                                            <AlertTriangle className="h-4 w-4" />
                                                            {pkg.issueCount} Issues
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {pkg.missingFields.slice(0, 3).map((field, i) => (
                                                                <Badge key={i} variant="secondary" className="text-xs">
                                                                    {field}
                                                                </Badge>
                                                            ))}
                                                            {pkg.missingFields.length > 3 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{pkg.missingFields.length - 3} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {canEdit('voya_trail_packages') && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="gap-2"
                                                                onClick={() => navigate(`/voya-trail/packages/${pkg.id}`)}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                                Fix
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default QualityControl;
