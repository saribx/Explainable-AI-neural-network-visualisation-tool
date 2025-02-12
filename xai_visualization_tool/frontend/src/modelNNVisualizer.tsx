/**
 * Neural Network Visualizer Component
 *
 * This component visualizes neural network architecture, including:
 * - Network layers and connections
 * - Neuron activations as histograms
 * - Weight matrices as colored connections
 * - Interactive zoom and filter controls
 * - First layer data visualization
 */
import React, {useEffect, useRef, useState} from "react";
import * as d3 from "d3";
import "./App.css";
import HistogramModel from "./HistogramModel";
import {
    ISettings,
    ConnectionData,
    NeuronData,
    HistogramBin,
    VisualizationData,
    ConnectionFilter,
    WeightSource,
    LayerStructure,
    MatrixModalProps
} from "./common";

// Interfaces used here are definied in common.tsx

// ============= Types & Interfaces =============

const MatrixModal: React.FC<MatrixModalProps> = ({data, onClose, neuronIndex}) => {
    const gridSize = 8;
    const cellSize = 50; // Larger size for the modal view

    return (
        <div className="histogram-modal-overlay" onClick={onClose}>
            <div className="histogram-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>
                <h2 className="modal-title">Weight Matrix - Neuron {neuronIndex}</h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                    gap: '2px',
                    padding: '20px'
                }}>
                    {Array.from({length: gridSize * gridSize}).map((_, idx) => {
                        const value = data[idx] || 0;
                        return (
                            <div
                                key={idx}
                                style={{
                                    width: cellSize,
                                    height: cellSize,
                                    backgroundColor: getWarmColdColor(value),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: value > 0.5 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
                                    fontSize: '12px'
                                }}
                            >
                                {value.toFixed(2)}
                            </div>
                        );

                    })}
                </div>
            </div>
        </div>
    );
};

interface ModelNetworkVisualizerProps {
    visualizationData: VisualizationData;
    firstLayerData?: number[] | null;
    settings: ISettings;
    setSettings: (settings: ISettings) => void;
}

// Refined D3 Selection type to handle various scenarios
type D3Selection = d3.Selection<
    d3.BaseType,
    unknown,
    HTMLElement | null,
    undefined
>;

interface SettingsProps {
    settings: ISettings;
    setSettings: (settings: ISettings) => void;
    modelStructure: LayerStructure[];
}


// ============= Utility Functions =============

/**
 * Maps a value to a color using a viridis-like color scheme
 */
// Warm-cold color mapping function
const getWarmColdColor = (value: number) => {
    // Normalisiere zu [-1,1] und dann zu [0,1]
    const normalized = (Math.max(-1, Math.min(1, value * 1.5)) + 1) / 2;

    const colors = [
        [65, 105, 175],    // Gedämpftes Blau (stark negativ)
        [130, 150, 200],   // Helles Blau (leicht negativ)
        [178, 178, 182],   // Fast Grau (null) - leicht bläulich/rötlich
        [200, 140, 140],   // Helles Rot (leicht positiv)
        [175, 95, 95]      // Gedämpftes Rot (stark positiv)
    ];

    const numSegments = colors.length - 1;
    const segment = Math.min(Math.floor(normalized * numSegments), numSegments - 1);
    const segmentT = (normalized * numSegments) - segment;

    const c1 = colors[segment];
    const c2 = colors[segment + 1];

    const r = Math.round(c1[0] + (c2[0] - c1[0]) * segmentT);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * segmentT);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * segmentT);

    return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Creates histogram data from an array of values
 */
const createHistogram = (
    values: number[],
    domain: [number, number],
    binCount: number
): HistogramBin[] => {
    const bins = d3.bin<number, number>().domain(domain).thresholds(binCount)(
        values
    );

    return bins.map((bin) => ({
        x0: bin.x0 ?? null,
        x1: bin.x1 ?? null,
        length: bin.length,
        x: bin.x0 ?? 0,
        y: bin.length,
    }));
};

const Settings: React.FC<SettingsProps> = ({
                                               settings,
                                               setSettings,
                                               modelStructure,
                                           }) => {
    const handleLayerChange = (layerIndex: number, value: string) => {
        const newLayers = [...(settings.layers.to_visualize || [])];
        newLayers[layerIndex] = value;
        setSettings({...settings, layers: {to_visualize: newLayers}});
    };

    return (
        <div className="settings">
            <div className="settings-panel">
                {modelStructure.map((layer, layerIndex) => (
                    <div key={layer.name} className="settings-layer">
                        {"modules" in layer && layer.modules!.length > 1 && (
                            <>
                                <label>{layer.name}</label>
                                <select
                                    value={settings.layers.to_visualize?.[layerIndex]}
                                    onChange={(e) =>
                                        handleLayerChange(layerIndex, e.target.value)
                                    }
                                >
                                    {layer.modules?.map((module) => (
                                        <option key={module} value={module}>
                                            {module}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Main Network Visualizer Component
 */
const ModelNetworkVisualizer: React.FC<ModelNetworkVisualizerProps> = ({
                                                                           visualizationData,
                                                                           firstLayerData,
                                                                           settings,
                                                                           setSettings,
                                                                       }) => {
    // ============= State & Refs =============
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedMatrix, setSelectedMatrix] = useState<{ data: number[], neuronIndex: number } | null>(null);
    const showMatrixModal = (neuronIndex: number, data: number[]) => {
        setSelectedMatrix({data, neuronIndex});
    };
    const [selectedNeuron, setSelectedNeuron] = useState<NeuronData | null>(null);
    const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>({
        showAll: true,
        showPositive: false,
        showNegative: false,
    });
    const [weightSource, setWeightSource] = useState<WeightSource>("model");

    useEffect(() => {
        if (visualizationData && !settings.layers.to_visualize) {
            setSettings({
                ...settings,
                layers: {
                    to_visualize: visualizationData.model_structure.map((layer) =>
                        "modules" in layer ? layer.modules?.[0] || "" : ""
                    ),
                },
            });
        }
    }, [visualizationData, settings, setSettings]);

    // ============= D3 Setup =============
    useEffect(() => {
        if (!visualizationData || !containerRef.current) return;

        const {model_structure, node_node_matrices, weight_matrices} =
            visualizationData;

        // Clear previous visualization
        d3.select(containerRef.current).selectAll("*").remove();

        // Setup dimensions and scales
        const margin = {top: 200, right: 100, bottom: 100, left: 100};
        const width = Math.max(
            1200,
            containerRef.current.clientWidth - margin.left - margin.right
        );
        const height = Math.max(
            4000,
            containerRef.current.clientHeight - margin.top - margin.bottom
        );
        const neuronRadius = 25;
        const layerSpacing = width / (model_structure.length - 1);
        const neuronSpacingFactor = 2;

        // Create SVG container
        const svg = d3
            .select(containerRef.current)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr(
                "viewBox",
                `0 0 ${width + margin.left + margin.right} ${
                    height + margin.top + margin.bottom
                }`
            )
            .attr("preserveAspectRatio", "xMidYMid meet") as unknown as D3Selection;

        // Create main group
        const mainGroup = svg
            .append("g")
            .attr(
                "transform",
                `translate(${margin.left},${margin.top})`
            ) as unknown as D3Selection;

        const connectionsData = weightSource === "model"
            ? weight_matrices
            : node_node_matrices || weight_matrices;

        // Setup zoom behavior
        const zoom = d3
            .zoom<Element, unknown>()
            .scaleExtent([0.1, 1]) // Sets the zoom scale range
            .on("zoom", (event) => {
                const {transform} = event;

                // Update network links
                mainGroup
                    .selectAll(".network-link")
                    .attr("y1", (d: any) => d.y1 * transform.k)
                    .attr("y2", (d: any) => d.y2 * transform.k);

                // Update neuron groups
                mainGroup
                    .selectAll(".neuron-group")
                    .attr(
                        "transform",
                        (d: any) => `translate(${d.x}, ${d.y * transform.k})`
                    );

                // Update input layer visualization
                mainGroup.select('.input-pixels')
                    .selectAll('rect, text')
                    .attr('y', function () {
                        return parseFloat(d3.select(this).attr('data-y')) * transform.k;
                    });

                // Update hidden layer visualization
                mainGroup.select('.hidden-pixels')
                    .selectAll('rect, text')
                    .attr('y', function () {
                        return parseFloat(d3.select(this).attr('data-y-h')) * transform.k;
                    });

                // Modify matrix cell and neuron matrix group transformations
                mainGroup.selectAll('.neuron-matrix-group')
                    .attr('transform', function () {
                        const baseY = parseFloat(d3.select(this).attr('data-base-y'));
                        return `translate(-40, ${baseY * transform.k})`;
                    });

                // Ensure matrix cells maintain their relative positions
                mainGroup.selectAll('.matrix-cell')
                    .attr('transform', function () {
                        const cell = d3.select(this);
                        const baseX = parseFloat(cell.attr('data-base-x'));
                        const baseY = parseFloat(cell.attr('data-base-y'));
                        return `translate(${baseX}, ${baseY})`;
                    });
            });

        (svg as any).call(zoom); // Attach zoom behavior

        setTimeout(() => {
            (svg as any).call(
                zoom.transform,
                d3.zoomIdentity.translate(margin.left, margin.top).scale(0.1) // Apply initial zoom
            );
        }, 0); // Delay to allow rendering


        // Draw network structure

        const weightRange =
            weightSource === "model"
                ? visualizationData.weight_range
                : visualizationData.node_node_range || visualizationData.weight_range;

        const connections = createConnections(
            model_structure,
            connectionsData,
            layerSpacing,
            height,
            neuronSpacingFactor
        );

        // Update color scale based on selected weight source
        const weightColorScale = d3
            .scaleSequential(d3.interpolateRdBu)
            .domain([weightRange.max, weightRange.min]);

        drawConnections(mainGroup, connections, weightColorScale, connectionFilter);
        drawNeurons(
            mainGroup,
            model_structure,
            visualizationData,
            layerSpacing,
            height,
            neuronRadius,
            neuronSpacingFactor,
            setSelectedNeuron,
            settings
        );

        if (firstLayerData) {
            drawInputVisualizations(
                mainGroup,
                firstLayerData,
                connectionsData,  // Pass the weight matrices
                height,
                model_structure,
                layerSpacing,
                neuronSpacingFactor,
                showMatrixModal
            );
        }

        drawControls(
            svg,
            width,
            weightColorScale,
            connectionFilter,
            setConnectionFilter,
            weightSource,
            setWeightSource,
            !!node_node_matrices
        );
    }, [
        visualizationData,
        firstLayerData,
        connectionFilter,
        weightSource,
        settings,
    ]);

    return (
        <div className="model-network-visualization">
            <div className="network-container">
                <Settings
                    settings={settings}
                    setSettings={setSettings}
                    modelStructure={visualizationData.model_structure}
                />
                <div ref={containerRef}/>
            </div>
            {selectedNeuron && (
                <HistogramModel
                    data={{
                        values: selectedNeuron.values,
                        targets: selectedNeuron.targets,
                    }}
                    onClose={() => setSelectedNeuron(null)}
                    layerIndex={selectedNeuron.layerIndex}
                    neuronIndex={selectedNeuron.neuronIndex}
                />
            )}
            {selectedMatrix && (
                <MatrixModal
                    data={selectedMatrix.data}
                    onClose={() => setSelectedMatrix(null)}
                    neuronIndex={selectedMatrix.neuronIndex}
                />
            )}
        </div>
    );
};

// ============= Helper Functions =============

const createConnections = (
    model_structure: LayerStructure[],
    weight_matrices: number[][][],
    layerSpacing: number,
    height: number,
    neuronSpacingFactor: number
): ConnectionData[] => {
    const connections: ConnectionData[] = [];

    // Log the input weight matrices for debugging
    console.log("Creating connections with matrices:", weight_matrices);

    model_structure.forEach((layer, layerIndex) => {
        if (layerIndex < model_structure.length - 1) {
            const nextLayer = model_structure[layerIndex + 1];
            const currentY =
                (height / Math.max(layer.neurons + 1, 2)) * neuronSpacingFactor;
            const nextY =
                (height / Math.max(nextLayer.neurons + 1, 2)) * neuronSpacingFactor;
            const weightMatrix = weight_matrices[layerIndex] || [];

            // Log the current weight matrix for this layer
            console.log(`Layer ${layerIndex} Weight Matrix:`, weightMatrix);

            for (let i = 0; i < layer.neurons; i++) {
                for (let j = 0; j < nextLayer.neurons; j++) {
                    // More robust weight extraction with extensive logging
                    const rawWeight = weightMatrix[j]?.[i];

                    // Extensive logging of weight extraction
                    console.log(
                        `Extracting weight for source neuron ${i}, target neuron ${j}:`,
                        {
                            rawWeight,
                            type: typeof rawWeight,
                        }
                    );

                    const weight = typeof rawWeight === "number" ? rawWeight : 0;

                    // Log the processed weight
                    console.log(`Processed weight: ${weight}`);

                    connections.push({
                        x1: layerIndex * layerSpacing,
                        y1: (i + 0.5) * (currentY / neuronSpacingFactor),
                        x2: (layerIndex + 1) * layerSpacing,
                        y2: (j + 0.5) * (nextY / neuronSpacingFactor),
                        weight,
                        sourceNeuron: i,
                        targetNeuron: j,
                    });
                }
            }
        }
    });
    console.log("Total connections created:", connections.length);
    return connections;
};

const drawConnections = (
    group: D3Selection,
    connections: ConnectionData[],
    colorScale: d3.ScaleSequential<string>,
    filter: ConnectionFilter
) => {
    group
        .selectAll(".network-link")
        .data(connections)
        .enter()
        .append("line")
        .attr("class", "network-link")
        .attr("x1", (d) => d.x1)
        .attr("y1", (d) => d.y1)
        .attr("x2", (d) => d.x2)
        .attr("y2", (d) => d.y2)
        .style("stroke", (d) => colorScale(d.weight))
        .style("stroke-width", (d) => Math.abs(d.weight) * 3 + 0.5)
        .style("visibility", (d) => {
            if (filter.showAll) return "visible";
            if (filter.showPositive && d.weight > 0.3) return "visible";
            if (filter.showNegative && d.weight < -0.3) return "visible";
            return "hidden";
        })
        .append("title")
        .text((d) => `Weight: ${d.weight.toFixed(3)}`);
};

const drawNeurons = (
    group: D3Selection,
    layers: LayerStructure[],
    visualizationData: VisualizationData,
    layerSpacing: number,
    height: number,
    radius: number,
    spacingFactor: number,
    setSelected: (neuron: NeuronData) => void,
    settings: ISettings
) => {
    const activations = visualizationData.activations;

    layers.forEach((layer, layerIndex) => {
        const neuronY = (height / Math.max(layer.neurons + 1, 2)) * spacingFactor;
        const moduleToVisualize = settings.layers.to_visualize?.[layerIndex] || '';
        const activationStart = layer.activation_start;
        const activationIdx = layerIndex === 0
            ? 0
            : activationStart + (layer.modules?.indexOf(moduleToVisualize) ?? 0);

        console.log(layerIndex, activationStart, activationIdx);

        for (let i = 0; i < layer.neurons; i++) {
            const neuronData: NeuronData = {
                x: layerIndex * layerSpacing,
                y: (i + 0.5) * (neuronY / spacingFactor),
                values: (activations[activationIdx]?.values?.map((x) => x[i]) ??
                    []) as number[],
                targets: (activations[activationIdx]?.targets ?? []) as number[],
                layerIndex,
                neuronIndex: i,
            };

            const neuronGroup = group
                .append("g")
                .datum(neuronData)
                .attr("class", "neuron-group")
                .attr("transform", `translate(${neuronData.x},${neuronData.y})`)
                .style("cursor", "pointer")
                .on("click", (event: MouseEvent) => {
                    event.stopPropagation();
                    setSelected(neuronData);
                }) as unknown as D3Selection;

            neuronGroup
                .append("circle")
                .attr("class", "network-node")
                .attr("r", radius);

            drawNeuronHistogram(neuronGroup, neuronData, radius);
        }
    });
};

const drawNeuronHistogram = (
    group: D3Selection,
    data: NeuronData,
    radius: number
) => {
    const histData = data.values;
    const extent = d3.extent(histData) as [number, number];
    const histogram = createHistogram(histData, extent, 8);

    const maxBinLength = d3.max(histogram, (d) => d.length) ?? 0;

    const xScale = d3
        .scaleLinear()
        .domain([histogram[0]?.x0 ?? 0, histogram[histogram.length - 1]?.x1 ?? 1])
        .range([-radius + 6, radius - 6]);

    const yScale = d3
        .scaleLinear()
        .domain([0, maxBinLength])
        .range([radius - 6, -radius + 6]);

    const histogramGroup = group.append("g").attr("class", "histogram-group");

    if (!data.targets?.length) {
        histogramGroup
            .selectAll("rect")
            .data(histogram)
            .enter()
            .append("rect")
            .attr("class", "histogram-bar")
            .attr("x", (d) => xScale(d.x0 ?? 0))
            .attr("width", (d) =>
                Math.max(2, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1)
            )
            .attr("y", (d) => yScale(d.length))
            .attr("height", (d) => Math.max(0, yScale(0) - yScale(d.length)))
            .style("fill", "#4f9deb")
            .style("opacity", 0.6);
    } else {
        const [class0Data, class1Data] = [
            histData.filter((_, i) => data.targets[i] === 0),
            histData.filter((_, i) => data.targets[i] === 1),
        ].map((d) => createHistogram(d, extent, 8));

        ["class0-bar", "class1-bar"].forEach((className, idx) => {
            histogramGroup
                .selectAll(`.${className}`)
                .data(idx === 0 ? class0Data : class1Data)
                .enter()
                .append("rect")
                .attr("class", `histogram-bar ${className}`)
                .attr("x", (d) => xScale(d.x0 ?? 0))
                .attr("width", (d) =>
                    Math.max(2, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 1)
                )
                .attr("y", (d) => yScale(d.length))
                .attr("height", (d) => Math.max(0, yScale(0) - yScale(d.length)))
                .style("fill", idx === 0 ? "red" : "blue")
                .style("opacity", 0.6);
        });
    }
};

const drawInputVisualizations = (
    group: D3Selection,
    data: number[],
    weightMatrices: number[][][],
    height: number,
    modelStructure: LayerStructure[],
    layerSpacing: number,
    neuronSpacingFactor: number,
    showMatrixModal: (neuronIndex: number, data: number[]) => void
) => {
    // Draw input layer visualization (keep original vertical layout)
    const pixelSize = 15;
    const inputNeurons = modelStructure[0].neurons;
    const firstHiddenNeurons = modelStructure[1].neurons;

    // Calculate spacings
    const inputPixelSpacing = (height / Math.max(inputNeurons + 1, 2)) * neuronSpacingFactor;
    const hiddenPixelSpacing = (height / Math.max(firstHiddenNeurons + 1, 2)) * neuronSpacingFactor;

    // Create visualization groups
    const visualizationGroup = group.append("g").attr("class", "input-visualizations");

    // Draw input layer pixels vertically (unchanged)
    const inputGroup = visualizationGroup.append("g").attr("class", "input-pixels");

    data.forEach((value, i) => {
        const yPos = (i + 0.5) * (inputPixelSpacing / neuronSpacingFactor);

        inputGroup
            .append("rect")
            .attr("x", -40)
            .attr("y", yPos - pixelSize / 2)
            .attr("data-y", yPos - pixelSize / 6)
            .attr("width", pixelSize)
            .attr("height", pixelSize)
            .attr("fill", getWarmColdColor(value))
            .append("title")
            .text(value.toFixed(2));

        inputGroup
            .append("text")
            .attr("x", -42)
            .attr("y", yPos)
            .attr("data-y", yPos)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "8px")
            .attr("fill", "#666")
            .text(value.toFixed(2));
    });

    // Draw first hidden layer with weight matrices
    const hiddenGroup = visualizationGroup
        .append("g")
        .attr("class", "hidden-pixels")
        .attr("transform", `translate(${layerSpacing}, 0)`);

    const miniGridSize = 8;
    const miniPixelSize = 4;
    const miniGridWidth = miniGridSize * miniPixelSize;
// Get the weight matrix for the first layer
    const firstLayerWeights = weightMatrices[0] || [];

    for (let i = 0; i < firstHiddenNeurons; i++) {
        const yPos = (i + 0.5) * (hiddenPixelSpacing / neuronSpacingFactor);
        const yPos_pixel = (i + 0.5) * (hiddenPixelSpacing / neuronSpacingFactor) - 3;

        // Get weights for this neuron
        const neuronWeights = firstLayerWeights[i] || [];

        // Create a group for each neuron's visualization
        const neuronGroup = hiddenGroup
            .append("g")
            .attr("class", "neuron-matrix-group")
            .attr("data-base-y", yPos_pixel)
            .attr("transform", `translate(-40, ${yPos_pixel - miniGridWidth / 2})`)
            .style("cursor", "pointer")
            .on("click", (event: MouseEvent) => {
                event.stopPropagation();
                showMatrixModal(i, neuronWeights);
            });

        // Draw 8x8 weight matrix for this neuron
        for (let row = 0; row < miniGridSize; row++) {
            for (let col = 0; col < miniGridSize; col++) {
                const idx = row * miniGridSize + col;
                const weight = neuronWeights[idx] || 0;

                const rectGroup = neuronGroup
                    .append("g")
                    .attr("class", "matrix-cell")
                    .attr("data-base-x", col * miniPixelSize - 20)
                    .attr("data-base-y", row * miniPixelSize - 10)
                    .attr("transform", `translate(${col * miniPixelSize - 20}, ${row * miniPixelSize})`);

                rectGroup
                    .append("rect")
                    .attr("width", miniPixelSize)
                    .attr("height", miniPixelSize)
                    .attr("fill", getWarmColdColor(weight))
                    .append("title")
                    .text(weight.toFixed(3));
            }
        }

        // Add neuron value text
        hiddenGroup
            .append("text")
            .attr("x", -62)
            .attr("y", yPos)
            .attr("data-y-h", yPos)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "8px")
            .attr("fill", "#666")
            .text(neuronWeights[0]?.toFixed(2) || "0.00");
    }
};

const drawControls = (
    svg: D3Selection,
    width: number,
    colorScale: d3.ScaleSequential<string>,
    filter: ConnectionFilter,
    setFilter: (filter: ConnectionFilter) => void,
    weightSource: WeightSource,
    setWeightSource: (source: WeightSource) => void,
    hasNodeNode: boolean
) => {
    try {
        const legendWidth = 800;
        const legendHeight = 20;
        const legendX = (width - legendWidth) / 2;

        // Create color gradient
        const defs = svg.append("defs");
        const gradient = defs
            .append("linearGradient")
            .attr("id", "weight-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%");

        gradient
            .selectAll("stop")
            .data(d3.range(-1, 1.1, 0.1))
            .enter()
            .append("stop")
            .attr("offset", (d) => (d + 1) * 50 + "%")
            .attr("stop-color", (d) => colorScale(d));

        // Add weight source selector in top right if node-node connections are available
        if (hasNodeNode) {
            const weightSourceOptions = [
                {
                    x: width - 85,
                    label: "Model Weights",
                    type: "model" as WeightSource,
                },
                {
                    x: width + 45,
                    label: "Custom Weights",
                    type: "node_node" as WeightSource,
                },
            ];

            const weightSourceGroup = svg
                .append("g")
                .attr("class", "weight-source-selector")
                .attr("transform", `translate(0, 20)`);

            weightSourceGroup
                .append("text")
                .attr("x", width - 20)
                .attr("y", 15)
                .style("font-size", "12px")
                .attr("text-anchor", "middle")
                .attr("fill", "#64748b")
                .text("WEIGHT SOURCE");

            weightSourceOptions.forEach(({x, label, type}) => {
                const isSelected = type === weightSource;

                const sourceGroup = weightSourceGroup
                    .append("g")
                    .attr("transform", `translate(${x}, 30)`)
                    .style("cursor", "pointer")
                    .on("click", () => {
                        setWeightSource(type as WeightSource);
                    });

                // Button background
                sourceGroup
                    .append("rect")
                    .attr("x", -60)
                    .attr("y", -10)
                    .attr("width", 120)
                    .attr("height", 30)
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("fill", isSelected ? "#9c27b0" : "white")
                    .attr("stroke", isSelected ? "#9c27b0" : "#cbd5e1")
                    .attr("stroke-width", 1)
                    .attr("opacity", isSelected ? 1 : 1);

                // Text
                sourceGroup
                    .append("text")
                    .attr("x", 0)
                    .attr("y", 5)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .text(label)
                    .attr("fill", isSelected ? "white" : "#475569")
                    .style("font-size", "12px")
                    .style("font-weight", isSelected ? "600" : "500");
            });
        }

        // Create controls group
        const controls = svg
            .append("g")
            .attr("class", "filter-controls")
            .attr("transform", `translate(${legendX}, 50)`);

        controls
            .append("text")
            .attr("x", 0)
            .attr("y", 0)
            .text("Show connections:")
            .style("font-size", "12px");

        const totalWidth = 400;
        const startX = (legendWidth - totalWidth) / 2;

        // Create filter options
        const options = [
            {x: startX, label: "All", type: "showAll"},
            {x: startX + 140, label: "Strong Positive", type: "showPositive"},
            {x: startX + 300, label: "Strong Negative", type: "showNegative"},
        ] as const;

        options.forEach(({x, label, type}) => {
            const checked = filter[type];
            controls
                .append("g")
                .attr("transform", `translate(${x}, -5)`)
                .style("cursor", "pointer")
                .on("click", () => {
                    const newFilter = {
                        showAll: false,
                        showPositive: false,
                        showNegative: false,
                        [type]: true,
                    };
                    setFilter(newFilter);
                })
                .append("text")
                .attr("class", "filter-option")
                .attr("data-type", type)
                .attr("x", 20)
                .attr("y", 10)
                .text(label)
                .attr("fill", checked ? "#2563eb" : "#666")
                .attr("font-weight", "bold")
                .style("font-size", "14px")
                .style("letter-spacing", "0.5px");
        });

        // Create legend
        const legend = svg
            .append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${legendX},100)`);

        legend
            .append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#weight-gradient)");

        const legendScale = d3
            .scaleLinear()
            .domain([colorScale.domain()[1], colorScale.domain()[0]])
            .range([0, legendWidth]);

        const legendAxis = d3
            .axisBottom(legendScale)
            .ticks(5)
            .tickFormat(d3.format(".1f"));

        legend
            .append("g")
            .attr("transform", `translate(0,${legendHeight})`)
            .call(legendAxis)
            .append("text")
            .attr("x", legendWidth / 2)
            .attr("y", 30)
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .text(
                `${weightSource === "model" ? "Model" : "Node-Node"} Connection Weights`
            );
    } catch (error) {
        console.error("Error in drawControls:", error);
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", 100)
            .attr("text-anchor", "middle")
            .attr("fill", "red")
            .text("Error rendering controls");
    }
};

export default ModelNetworkVisualizer;