import React, { useEffect, useRef, useState } from 'react';
import { useMap } from '../context/MapContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const COUNTRY_LABELS = [
    { name: "INDIA", lon: 78.96, lat: 20.59 },
    { name: "CHINA", lon: 104.19, lat: 35.86 },
    { name: "RUSSIA", lon: 105.31, lat: 61.52 },
    { name: "USA", lon: -95.71, lat: 37.09 },
    { name: "BRAZIL", lon: -51.92, lat: -14.23 },
    { name: "AUSTRALIA", lon: 133.77, lat: -25.27 },
    { name: "CANADA", lon: -106.34, lat: 56.13 },
    { name: "SOUTH AFRICA", lon: 25.0, lat: -30.0 },
    { name: "EGYPT", lon: 30.8, lat: 26.8 },
    { name: "UK", lon: -3.43, lat: 55.37 },
    { name: "FRANCE", lon: 2.21, lat: 46.22 },
    { name: "GERMANY", lon: 10.45, lat: 51.16 },
    { name: "JAPAN", lon: 138.25, lat: 36.2 },
    { name: "SAUDI ARABIA", lon: 45.0, lat: 23.8 },
    { name: "INDONESIA", lon: 113.92, lat: -0.78 }
];

const CanvasGlobe = () => {
    const canvasRef = useRef(null);
    const { selectedAOI, secondaryAOI } = useMap();
    const [rotation, setRotation] = useState({ lambda: 71, phi: 22 }); // Centered near India initially
    const [globeZoom, setGlobeZoom] = useState(260); // Scale factor representing radius in pixels
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const rotationStart = useRef({ lambda: 0, phi: 0 });
    const [landData, setLandData] = useState(null);

    // Fetch simplified world land boundaries once
    useEffect(() => {
        const fetchWorld = async () => {
            try {
                const res = await axios.get('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json');
                if (res.data && res.data.objects && res.data.objects.land) {
                    const geometries = res.data.objects.land.geometries;
                    const polygons = [];
                    geometries.forEach(geom => {
                        if (geom.type === "Polygon") {
                            const coords = decodeArc(geom.arcs[0], res.data);
                            polygons.push(coords);
                        } else if (geom.type === "MultiPolygon") {
                            geom.arcs.forEach(arcGroup => {
                                const coords = decodeArc(arcGroup[0], res.data);
                                polygons.push(coords);
                            });
                        }
                    });
                    setLandData(polygons);
                }
            } catch (err) {
                console.warn("Could not load online world map atlas, falling back to procedural continents.");
            }
        };
        fetchWorld();
    }, []);

    const decodeArc = (arcIndices, topoData) => {
        const transform = topoData.transform;
        const scale = transform.scale;
        const translate = transform.translate;
        
        let x = 0, y = 0;
        const coords = [];
        
        arcIndices.forEach(idx => {
            const isReversed = idx < 0;
            const arcIdx = isReversed ? ~idx : idx;
            const arc = topoData.arcs[arcIdx];
            
            const points = [];
            let ax = 0, ay = 0;
            arc.forEach((pt) => {
                ax += pt[0];
                ay += pt[1];
                points.push([
                    ax * scale[0] + translate[0],
                    ay * scale[1] + translate[1]
                ]);
            });
            
            if (isReversed) {
                points.reverse();
            }
            points.forEach(pt => coords.push(pt));
        });
        return coords;
    };

    // Orthographic projection math
    const project = (lon, lat, lambda0, phi0, radius, cx, cy) => {
        const radLon = lon * Math.PI / 180;
        const radLat = lat * Math.PI / 180;
        const radLambda0 = lambda0 * Math.PI / 180;
        const radPhi0 = phi0 * Math.PI / 180;
        
        // Clip points on the back side of the sphere
        const cosClip = Math.sin(radPhi0) * Math.sin(radLat) + Math.cos(radPhi0) * Math.cos(radLat) * Math.cos(radLon - radLambda0);
        if (cosClip < 0.05) return null; // Small threshold to clip cleanly at edges
        
        const x = radius * Math.cos(radLat) * Math.sin(radLon - radLambda0);
        const y = -radius * (Math.cos(radPhi0) * Math.sin(radLat) - Math.sin(radPhi0) * Math.cos(radLat) * Math.cos(radLon - radLambda0));
        
        return { x: cx + x, y: cy + y };
    };

    // Main Draw loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const baseWidth = 650;
        const baseHeight = 650;
        
        // Scale Canvas backing pixels for High-DPI screens (Retina)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = baseWidth * dpr;
        canvas.height = baseHeight * dpr;
        canvas.style.width = `${baseWidth}px`;
        canvas.style.height = `${baseHeight}px`;
        
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;

        const cx = baseWidth / 2;
        const cy = baseHeight / 2;
        const radius = globeZoom;

        ctx.clearRect(0, 0, baseWidth, baseHeight);

        // 1. Draw Space Atmosphere Glow Outer
        const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.96, cx, cy, radius * 1.15);
        glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
        glowGrad.addColorStop(0.3, 'rgba(14, 165, 233, 0.15)');
        glowGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw Ocean Sphere Base
        const oceanGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
        oceanGrad.addColorStop(0, '#0e2345');
        oceanGrad.addColorStop(0.8, '#051124');
        oceanGrad.addColorStop(1, '#020710');
        ctx.fillStyle = oceanGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Draw Graticules (Latitude / Longitude Grid lines)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1;
        
        // Latitudes
        for (let lat = -80; lat <= 80; lat += 20) {
            ctx.beginPath();
            let first = true;
            for (let lon = -180; lon <= 180; lon += 5) {
                const pt = project(lon, lat, rotation.lambda, rotation.phi, radius, cx, cy);
                if (pt) {
                    if (first) {
                        ctx.moveTo(pt.x, pt.y);
                        first = false;
                    } else {
                        ctx.lineTo(pt.x, pt.y);
                    }
                }
            }
            ctx.stroke();
        }

        // Longitudes
        for (let lon = -180; lon <= 180; lon += 20) {
            ctx.beginPath();
            let first = true;
            for (let lat = -90; lat <= 90; lat += 5) {
                const pt = project(lon, lat, rotation.lambda, rotation.phi, radius, cx, cy);
                if (pt) {
                    if (first) {
                        ctx.moveTo(pt.x, pt.y);
                        first = false;
                    } else {
                        ctx.lineTo(pt.x, pt.y);
                    }
                }
            }
            ctx.stroke();
        }

        // 4. Draw Landmasses
        if (landData) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.72)'; // Emerald Green
            ctx.strokeStyle = '#047857';
            ctx.lineWidth = 1;
            
            landData.forEach(poly => {
                ctx.beginPath();
                let first = true;
                poly.forEach(coord => {
                    const pt = project(coord[0], coord[1], rotation.lambda, rotation.phi, radius, cx, cy);
                    if (pt) {
                        if (first) {
                            ctx.moveTo(pt.x, pt.y);
                            first = false;
                        } else {
                            ctx.lineTo(pt.x, pt.y);
                        }
                    }
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        }

        // 5. Draw Country Name Labels (Dynamic Clipping)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.textAlign = 'center';
        ctx.font = '9px monospace';

        COUNTRY_LABELS.forEach(lbl => {
            const pt = project(lbl.lon, lbl.lat, rotation.lambda, rotation.phi, radius, cx, cy);
            if (pt) {
                // Stroke text for readability against borders
                ctx.strokeText(lbl.name, pt.x, pt.y);
                ctx.fillText(lbl.name, pt.x, pt.y);
                
                // Capital dot
                ctx.fillStyle = '#67e8f9';
                ctx.beginPath();
                ctx.arc(pt.x, pt.y - 6, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
            }
        });

        // 6. Draw Active Selected AOI Pin Location
        if (selectedAOI && selectedAOI.coordinates) {
            let lat = 22.2587, lon = 71.1924; // Defaults
            if (selectedAOI.type === 'Polygon') {
                const coords = selectedAOI.coordinates[0];
                lat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
                lon = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
            }
            const pt = project(lon, lat, rotation.lambda, rotation.phi, radius, cx, cy);
            if (pt) {
                // Glow rings
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 8 + Math.sin(Date.now() / 150) * 3, 0, Math.PI * 2);
                ctx.stroke();

                // Centroid Pin
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Label
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.font = 'bold 9px sans-serif';
                ctx.strokeText("📍 Target AOI", pt.x, pt.y - 12);
                ctx.fillText("📍 Target AOI", pt.x, pt.y - 12);
            }
        }

        // 7. Draw Atmosphere Limiting Shading (Shadow ring overlays)
        const shadowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // 8. Sphere Outline border
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

    }, [landData, rotation, globeZoom, selectedAOI, secondaryAOI]);

    // Drag-to-rotate handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        rotationStart.current = { lambda: rotation.lambda, phi: rotation.phi };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        
        setRotation({
            lambda: rotationStart.current.lambda - dx * 0.35,
            phi: Math.max(-75, Math.min(75, rotationStart.current.phi + dy * 0.35))
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Wheel scroll zoom support
    const handleWheel = (e) => {
        setGlobeZoom(prev => Math.max(120, Math.min(600, prev - e.deltaY * 0.25)));
    };

    return (
        <div 
            className="w-full h-full flex flex-col items-center justify-center bg-gray-950/90 cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {/* Background space starfields */}
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none animate-[pulse_6s_infinite]"></div>

            <div className="text-[10px] font-mono tracking-widest text-sky-400/40 uppercase absolute top-10 font-bold pointer-events-none">
                🌐 Interactive Geodetic 3D Globe Projection
            </div>

            {/* Sharp scaled Canvas */}
            <canvas 
                ref={canvasRef} 
                className="drop-shadow-[0_25px_60px_rgba(0,0,0,0.9)] max-w-full max-h-full transition-transform duration-100"
            />

            {/* Click Zoom Controls HUD */}
            <div className="absolute bottom-6 right-6 z-[1010] flex flex-col gap-1.5 bg-gray-900/90 border border-gray-800 rounded-xl p-1.5 shadow-lg backdrop-blur-md">
                <button 
                    onClick={() => setGlobeZoom(prev => Math.min(600, prev + 30))}
                    className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-all"
                    title="Zoom In"
                >
                    ＋
                </button>
                <button 
                    onClick={() => setGlobeZoom(prev => Math.max(120, prev - 30))}
                    className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-all"
                    title="Zoom Out"
                >
                    －
                </button>
            </div>

            <div className="absolute bottom-6 left-6 text-[9px] text-gray-500 font-mono tracking-wider bg-gray-900/40 px-2.5 py-1.5 rounded-lg pointer-events-none border border-gray-800/30">
                Drag to spin • Scroll / +/- to zoom • Center: {rotation.lambda.toFixed(0)}°E, {rotation.phi.toFixed(0)}°N
            </div>
        </div>
    );
};

export default CanvasGlobe;
