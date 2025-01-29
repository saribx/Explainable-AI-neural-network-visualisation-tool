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

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./App.css";
import HistogramModel from "./HistogramModel";
import { ISettings } from "./common";

// ============= Types & Interfaces =============
interface LayerStructure {
  name: string;
  neurons: number;
  layer_type: string;
  modules: undefined | string[];
  activation_start: number;
}

interface ConnectionData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  weight: number;
  sourceNeuron: number;
  targetNeuron: number;
}

interface NeuronData {
  x: number;
  y: number;
  values: number[];
  targets: number[];
  layerIndex: number;
  neuronIndex: number;
}

interface HistogramBin {
  x0: number | null;
  x1: number | null;
  length: number;
  x: number;
  y: number;
}

interface VisualizationData {
  model_structure: LayerStructure[];
  activations: {
    values: number[][];
    targets: number[];
  }[];
  weight_matrices: number[][][];
  weight_range: {
    min: number;
    max: number;
  };
  layers: string[][];
}

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

// Connection filter type to resolve undefined reference
interface ConnectionFilter {
  showAll: boolean;
  showPositive: boolean;
  showNegative: boolean;
}

interface SettingsProps {
  settings: ISettings;
  setSettings: (settings: ISettings) => void;
  modelStructure: LayerStructure[];
}

interface VisualizationData {
  model_structure: LayerStructure[];
  activations: {
    values: number[][];
    targets?: number[];
  }[];
  weight_matrices: number[][][];
  node_node_matrices?: number[][][];
  weight_range: {
    min: number;
    max: number;
  };
  node_node_range?: {
    min: number;
    max: number;
  };
}

// ============= Utility Functions =============

/**
 * Maps a value to a color using a viridis-like color scheme
 */
const getViridisColor = (value: number): string => {
  const colors = [
    [68, 1, 84], // Dark purple
    [70, 50, 127], // Purple
    [59, 82, 139], // Blue
    [33, 144, 141], // Teal
    [93, 201, 99], // Green
    [253, 231, 37], // Yellow
  ];

  const v = Math.max(0, Math.min(1, value));
  const numSegments = colors.length - 1;
  const segment = Math.min(Math.floor(v * numSegments), numSegments - 1);
  const segmentT = v * numSegments - segment;

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
    setSettings({ ...settings, layers: { to_visualize: newLayers } });
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
                  {layer.modules?.map((module, i) => (
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
type WeightSource = "model" | "node_node";

const ModelNetworkVisualizer: React.FC<ModelNetworkVisualizerProps> = ({
  visualizationData,
  firstLayerData,
  settings,
  setSettings,
}) => {
  // ============= State & Refs =============
  const containerRef = useRef<HTMLDivElement>(null);
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

    const { model_structure, node_node_matrices, weight_matrices } =
      visualizationData;

    // Clear previous visualization
    d3.select(containerRef.current).selectAll("*").remove();

    // Setup dimensions and scales
    const margin = { top: 200, right: 100, bottom: 100, left: 100 };
    const width = Math.max(
      1200,
      containerRef.current.clientWidth - margin.left - margin.right
    );
    const height = Math.max(
      1000,
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

    // Setup zoom behavior
    const zoom = d3
      .zoom<Element, unknown>()
      .scaleExtent([0.5, 4]) // Sets the zoom scale range
      .on("zoom", (event) => {
        const { transform } = event;

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
      });

    (svg as any)
      .call(zoom)
      .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

    // Draw network structure
    // Use either model weights or node-node weights based on selection
    const connectionsData =
      weightSource === "model"
        ? weight_matrices
        : node_node_matrices || weight_matrices;

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
        height,
        model_structure,
        layerSpacing,
        neuronSpacingFactor
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
        <div ref={containerRef} />
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

          const weight = (() => {
            if (typeof rawWeight === "number") return rawWeight;
            if (typeof rawWeight === "string") {
              const parsed = parseFloat(rawWeight);
              return isNaN(parsed) ? 0 : parsed;
            }
            return 0;
          })();

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
    const moduleToVisualize = settings.layers.to_visualize?.[layerIndex];
    const activationStart = layer.activation_start;
    const activationIdx =
      layerIndex == 0
        ? 0
        : activationStart + layer.modules?.indexOf(moduleToVisualize) ?? 0;

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
  height: number,
  modelStructure: LayerStructure[],
  layerSpacing: number,
  neuronSpacingFactor: number
) => {
  // Draw input layer visualization
  const pixelSize = 15;
  const pixelGap = 2;
  const inputNeurons = modelStructure[0].neurons;
  const firstHiddenNeurons = modelStructure[1].neurons;

  // Input layer spacing
  const inputPixelSpacing =
    (height / Math.max(inputNeurons + 1, 2)) * neuronSpacingFactor;

  // First hidden layer spacing
  const hiddenPixelSpacing =
    (height / Math.max(firstHiddenNeurons + 1, 2)) * neuronSpacingFactor;

  // Create group for input visualizations that will be affected by zoom
  const visualizationGroup = group
    .append("g")
    .attr("class", "input-visualizations");

  // Draw input layer pixels
  const inputGroup = visualizationGroup
    .append("g")
    .attr("class", "input-pixels");

  data.forEach((value, i) => {
    const yPos = (i + 0.5) * (inputPixelSpacing / neuronSpacingFactor);

    inputGroup
      .append("rect")
      .attr("x", -40)
      .attr("y", yPos - pixelSize / 2)
      .attr("data-y", yPos - pixelSize / 6)  // Store original y position
      .attr("width", pixelSize)
      .attr("height", pixelSize)
      .attr("fill", getViridisColor(value))
      .append("title")
      .text(value.toFixed(2));

    inputGroup
      .append("text")
      .attr("x", -42)
      .attr("y", yPos)
      .attr("data-y", yPos)  // Store original y position
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "8px")
      .attr("fill", "#666")
      .text(value.toFixed(2));
  });

  // Draw first hidden layer pixels (reshaped)
  const hiddenGroup = visualizationGroup
    .append("g")
    .attr("class", "hidden-pixels")
    .attr("transform", `translate(${layerSpacing}, 0)`);

  // Reshape the data to match first hidden layer neurons
  const reshapedData = [];
  const elementsPer = Math.ceil(data.length / firstHiddenNeurons);

  for (let i = 0; i < firstHiddenNeurons; i++) {
    const start = i * elementsPer;
    const chunk = data.slice(start, start + elementsPer);
    const avgValue = chunk.reduce((a, b) => a + b, 0) / chunk.length;
    reshapedData.push(avgValue);
  }

  reshapedData.forEach((value, i) => {
    const yPos = (i + 0.5) * (hiddenPixelSpacing / neuronSpacingFactor);

    hiddenGroup
      .append("rect")
      .attr("x", -40)
      .attr("y", yPos - pixelSize / 2)
      .attr("data-y-h", yPos- pixelSize / 6)  // Store original y position
      .attr("width", pixelSize)
      .attr("height", pixelSize)
      .attr("fill", getViridisColor(value))
      .append("title")
      .text(value.toFixed(2));

    hiddenGroup
      .append("text")
      .attr("x", -42)
      .attr("y", yPos)
      .attr("data-y-h", yPos)  // Store original y position
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "8px")
      .attr("fill", "#666")
      .text(value.toFixed(2));
  });
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
          x: width - 100,
          label: "Model Weights",
          type: "model" as WeightSource,
        },
        {
          x: width + 50,
          label: "Node Connections",
          type: "node_node" as WeightSource,
        },
      ];

      const weightSourceGroup = svg
        .append("g")
        .attr("class", "weight-source-selector")
        .attr("transform", `translate(0, 20)`);

      weightSourceGroup
        .append("text")
        .attr("x", width - 50)
        .attr("y", 0)
        .style("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Weight Source:");

      weightSourceOptions.forEach(({ x, label, type }) => {
        const isSelected = type === weightSource;

        const sourceGroup = weightSourceGroup
          .append("g")
          .attr("transform", `translate(${x}, 10)`)
          .style("cursor", "pointer")
          .on("click", () => {
            setWeightSource(type as WeightSource);
          });

        sourceGroup
          .append("rect")
          .attr("x", -60)
          .attr("y", 0)
          .attr("width", 120)
          .attr("height", 30)
          .attr("rx", 15)
          .attr("ry", 15)
          .attr("fill", isSelected ? "#2563eb" : "#e0e0e0")
          .attr("opacity", 0.8);

        sourceGroup
          .append("text")
          .attr("x", 0)
          .attr("y", 15)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .text(label)
          .attr("fill", isSelected ? "white" : "#666")
          .attr("font-weight", "bold")
          .style("font-size", "12px");
      });
    }

    // Create controls group
    const controls = svg
      .append("g")
      .attr("class", "filter-controls")
      .attr("transform", `translate(${legendX}, 50)`);

    // Rest of the original controls remain exactly the same
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
      { x: startX, label: "All", type: "showAll" },
      { x: startX + 140, label: "Strong Positive", type: "showPositive" },
      { x: startX + 300, label: "Strong Negative", type: "showNegative" },
    ] as const;

    options.forEach(({ x, label, type }) => {
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