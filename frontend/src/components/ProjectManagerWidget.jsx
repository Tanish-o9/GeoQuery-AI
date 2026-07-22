import React, { useEffect, useState } from 'react';
import { useMap } from '../context/MapContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ProjectManagerWidget = () => {
    const { userProfile, setUserProfile, analysisResults } = useMap();
    const [treeData, setTreeData] = useState({ folders: [], projects: [] });
    const [selectedProject, setSelectedProject] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [newProjName, setNewProjName] = useState('');
    const [commentText, setCommentText] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(true);

    const email = userProfile?.email || 'viewer@geoquery.ai';

    const loadTree = async () => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/projects/tree?email=${email}`);
            setTreeData(res.data);
            if (res.data.projects.length > 0 && !selectedProject) {
                setSelectedProject(res.data.projects[0]);
            }
        } catch (e) {
            console.error("Error loading project workspace tree:", e);
        }
    };

    useEffect(() => {
        if (userProfile) {
            loadTree();
        }
    }, [userProfile]);

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            await axios.post('http://127.0.0.1:8000/api/projects/folder', { name: newFolderName });
            setNewFolderName('');
            loadTree();
            toast.success("Folder created successfully!");
        } catch (err) {
            toast.error("Failed to create folder.");
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!newProjName.trim()) return;
        try {
            await axios.post('http://127.0.0.1:8000/api/projects/create', {
                name: newProjName,
                owner: email
            });
            setNewProjName('');
            loadTree();
            toast.success("Project workspace initialized!");
        } catch (err) {
            toast.error("Failed to initialize project.");
        }
    };

    const handleShare = async (e) => {
        e.preventDefault();
        if (!selectedProject || !shareEmail.trim()) return;
        try {
            await axios.post('http://127.0.0.1:8000/api/projects/share', {
                project_id: selectedProject.id,
                share_email: shareEmail
            });
            toast.success(`Access authorization shared with ${shareEmail}`);
            setShareEmail('');
            loadTree();
        } catch (err) {
            toast.error("Access sharing failed.");
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!selectedProject || !commentText.trim()) return;
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/projects/comment', {
                project_id: selectedProject.id,
                user_email: email,
                text: commentText
            });
            setSelectedProject(prev => ({
                ...prev,
                comments: [...prev.comments, res.data]
            }));
            setCommentText('');
            loadTree();
            toast.success("Comment posted!");
        } catch (err) {
            toast.error("Comment submission failed.");
        }
    };

    const handleCommitVersion = async () => {
        if (!selectedProject) return;
        if (!analysisResults) {
            toast.error("No active analysis metrics to commit. Draw and analyze a polygon first!");
            return;
        }

        const commitName = prompt("Enter version tag (e.g., 'NDVI post-rain draft'):");
        if (!commitName) return;

        try {
            const res = await axios.post('http://127.0.0.1:8000/api/projects/commit-version', {
                project_id: selectedProject.id,
                name: commitName,
                metrics: analysisResults.metrics
            });
            setSelectedProject(prev => ({
                ...prev,
                versions: [...prev.versions, res.data]
            }));
            loadTree();
            toast.success(`Snapshot version ${res.data.version_id} saved!`);
        } catch (err) {
            toast.error("Version commit failed.");
        }
    };

    const handleLogout = () => {
        setUserProfile(null);
        toast.success("Logged out successfully.");
    };

    if (isCollapsed) {
        return (
            <button
                onClick={() => setIsCollapsed(false)}
                className="absolute top-5 left-48 z-[1000] flex h-10 px-3 items-center gap-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-white font-medium text-xs shadow-lg border border-gray-700/50 transition-all duration-200"
                title="Open Team Workspaces"
            >
                📁 Workspaces
            </button>
        );
    }

    return (
        <div className="absolute top-5 left-48 z-[1000] w-80 rounded-2xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-2xl text-white overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-950 px-4 py-3 border-b border-gray-700/50">
                <span className="font-semibold tracking-wider text-xs text-sky-400 uppercase">📁 Team Workspace</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleLogout}
                        className="text-[9px] bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 px-2 py-0.5 rounded transition-colors"
                        title="Logout session"
                    >
                        Exit
                    </button>
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Panel Area */}
            <div className="p-3.5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
                
                {/* 1. Folders Tree Listing */}
                <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest pl-0.5">Directories</span>
                    <div className="space-y-1 pl-1">
                        {treeData.folders.map(f => (
                            <div key={f.id} className="flex items-center gap-1.5 text-gray-300 font-medium">
                                📁 <span>{f.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Active Projects selection */}
                <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest pl-0.5">Workspaces</span>
                    <div className="flex flex-col gap-1 pl-1">
                        {treeData.projects.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedProject(p)}
                                className={`cursor-pointer p-2 rounded-xl flex justify-between items-center transition-all ${
                                    selectedProject?.id === p.id 
                                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                                        : 'bg-gray-800/40 border border-gray-800 text-gray-400 hover:text-white'
                                }`}
                            >
                                <span className="font-semibold">{p.name}</span>
                                <span className="text-[9px] text-gray-500 font-mono">owner: {p.owner.split('@')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Selected Project Operations Panel */}
                {selectedProject && (
                    <div className="border-t border-gray-800 pt-3.5 space-y-3">
                        <span className="text-[11px] font-semibold text-gray-200 uppercase tracking-wider block">Selected: {selectedProject.name}</span>
                        
                        {/* A. Sharing controls (RESTRICTED TO ADMIN/MANAGER) */}
                        {["Admin", "Manager"].includes(userProfile?.role) ? (
                            <form onSubmit={handleShare} className="flex gap-1">
                                <input
                                    type="email"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    placeholder="share@geoquery.ai"
                                    className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-sky-500"
                                />
                                <button type="submit" className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-xs font-bold rounded-lg shadow">
                                    Share
                                </button>
                            </form>
                        ) : (
                            <div className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold bg-gray-950 p-2 rounded text-center">
                                Sharing restricted to Leads/Admins
                            </div>
                        )}

                        {/* B. Version History commits */}
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-baseline">
                                <span className="text-gray-400 font-semibold">Version Checkpoints:</span>
                                {["Admin", "Manager"].includes(userProfile?.role) && (
                                    <button
                                        onClick={handleCommitVersion}
                                        className="text-[9px] text-sky-400 hover:underline"
                                    >
                                        Save Snapshot
                                    </button>
                                )}
                            </div>
                            <div className="bg-gray-950 p-2 rounded-xl space-y-1 max-h-[80px] overflow-y-auto font-mono text-[10px] text-gray-400">
                                {selectedProject.versions?.map((v, idx) => (
                                    <div key={idx} className="flex justify-between border-b border-gray-900 pb-0.5">
                                        <span className="text-gray-300">{v.name}</span>
                                        <span className="text-sky-300 font-bold">{v.version_id}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* C. Team collaboration Comments */}
                        <div className="space-y-2 text-xs">
                            <span className="text-gray-400 font-semibold">Collaboration Comments:</span>
                            <div className="bg-gray-950 p-2 rounded-xl space-y-2 max-h-[120px] overflow-y-auto text-[11px] text-gray-400 leading-relaxed scrollbar-thin">
                                {selectedProject.comments?.map((c, idx) => (
                                    <div key={idx} className="border-b border-gray-900 pb-1.5">
                                        <div className="flex justify-between text-[9px] text-gray-500 font-semibold mb-0.5">
                                            <span>{c.user.split('@')[0]}</span>
                                            <span>{new Date(c.timestamp * 1000).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-gray-300">{c.text}</p>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleComment} className="flex gap-1 pt-1">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Write comments..."
                                    className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-650 outline-none focus:border-sky-500"
                                />
                                <button type="submit" className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-lg border border-gray-700">
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* 4. Creator Forms (RESTRICTED TO LEADS/ADMINS) */}
                {["Admin", "Manager"].includes(userProfile?.role) && (
                    <div className="border-t border-gray-800 pt-3.5 space-y-3 text-xs">
                        <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest pl-0.5">Create Workspace Elements</span>
                        
                        <form onSubmit={handleCreateFolder} className="flex gap-1">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New Folder name"
                                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-650 outline-none focus:border-sky-500"
                            />
                            <button type="submit" className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-lg border border-gray-700">
                                + Folder
                            </button>
                        </form>

                        <form onSubmit={handleCreateProject} className="flex gap-1">
                            <input
                                type="text"
                                value={newProjName}
                                onChange={(e) => setNewProjName(e.target.value)}
                                placeholder="New Project name"
                                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-650 outline-none focus:border-sky-500"
                            />
                            <button type="submit" className="px-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-xs font-bold rounded-lg shadow">
                                + Project
                            </button>
                        </form>
                    </div>
                )}

            </div>
            
            {/* Footer */}
            <div className="bg-gray-950 p-2 text-center border-t border-gray-800/80 flex items-center justify-between text-[9px] text-gray-500">
                <span>Role: <strong className="text-sky-400">{userProfile?.role}</strong></span>
                <span>Active: {userProfile?.name.split(' ')[0]}</span>
            </div>
        </div>
    );
};

export default ProjectManagerWidget;
