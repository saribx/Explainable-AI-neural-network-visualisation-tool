import React, { useEffect, useRef, type FC } from "react";
import * as d3 from "d3";
import "./App.css";

interface HistogramModalProps {
  data: {
    values: number[];
    targets?: number[];
  };
  onClose: () => void;
  layerIndex?: number;
  neuronIndex?: number;
}

interface HistogramBin extends d3.Bin<number, number> {
  x0: number | undefined;
  x1: number | undefined;
  length: number;
}

interface HistogramData {
  data: HistogramBin[];
  className: string;
  fill: string;
}

const HistogramModal: FC<HistogramModalProps> = ({
  data,
  onClose,
  layerIndex,
  neuronIndex,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modalRef.current || !data.values?.length) return;

    d3.select(modalRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 500,
      height = 350;
    const svg = d3
      .select(modalRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const binCount = 100;

    // Create histogram generator
    const binGenerator = d3
      .bin<number, number>()
      .domain([d3.min(data.values) || 0, d3.max(data.values) || 1])
      .thresholds(binCount);

    const histogram = binGenerator(data.values);

    const xScale = d3
      .scaleLinear()
      .domain([d3.min(data.values) || 0, d3.max(data.values) || 1])
      .range([0, width])
      .nice();

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(histogram, (d) => d.length) || 0])
      .range([height, 0])
      .nice();

    if (data.targets?.length) {
      const class0Data = data.values.filter((_, i) => data.targets?.[i] === 0);
      const class1Data = data.values.filter((_, i) => data.targets?.[i] === 1);

      const hist0 = binGenerator(class0Data);
      const hist1 = binGenerator(class1Data);

      svg
        .append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(
          d3
            .axisLeft(yScale)
            .tickSize(-width)
            .tickFormat(() => "")
        );

      const histogramData: HistogramData[] = [
        { data: hist0 as HistogramBin[], className: "class0-bar", fill: "red" },
        {
          data: hist1 as HistogramBin[],
          className: "class1-bar",
          fill: "blue",
        },
      ];

      histogramData.forEach(({ data: histData, className, fill }) => {
        svg
          .selectAll(`.${className}`)
          .data(histData)
          .enter()
          .append("rect")
          .attr("class", `histogram-bar ${className}`)
          .attr("x", (d: HistogramBin) => xScale(d.x0 || 0))
          .attr("width", (d: HistogramBin) =>
            Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1)
          )
          .attr("y", (d: HistogramBin) => yScale(d.length))
          .attr("height", (d: HistogramBin) => height - yScale(d.length))
          .style("fill", fill)
          .style("opacity", 0.6);
      });

      const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 100}, -10)`);

      [0, 1].forEach((classNum, i) => {
        legend
          .append("rect")
          .attr("x", 0)
          .attr("y", i * 20)
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", classNum ? "blue" : "red")
          .attr("opacity", 0.6);

        legend
          .append("text")
          .attr("x", 20)
          .attr("y", i * 20 + 9)
          .attr("font-size", "12px")
          .text(`Class ${classNum}`);
      });
    } else {
      svg
        .selectAll(".histogram-bar")
        .data(histogram)
        .enter()
        .append("rect")
        .attr("class", "histogram-bar")
        .attr("x", (d: HistogramBin) => xScale(d.x0 || 0))
        .attr("width", (d: HistogramBin) =>
          Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1)
        )
        .attr("y", (d: HistogramBin) => yScale(d.length))
        .attr("height", (d: HistogramBin) => height - yScale(d.length))
        .style("fill", "#4f9deb")
        .style("opacity", 0.8);
    }

    const addAxis = (
      scale: d3.AxisScale<d3.NumberValue>,
      position: string,
      label: string
    ) => {
      const axis =
        position === "bottom" ? d3.axisBottom(scale) : d3.axisLeft(scale);
      const g = svg
        .append("g")
        .attr(
          "transform",
          position === "bottom" ? `translate(0,${height})` : ""
        )
        .call(axis);

      g.append("text").attr("fill", "#666").attr("text-anchor", "middle");

      if (position === "bottom") {
        g.select("text")
          .attr("x", width / 2)
          .attr("y", 25)
          .text(label);
      } else {
        g.select("text")
          .attr("transform", "rotate(-90)")
          .attr("y", -40)
          .attr("x", (2 * height) / 3)
          .text(label);
      }
    };

    addAxis(xScale, "bottom", "Activation Value");
    addAxis(yScale, "left", "Frequency");
  }, [data]);

  return (
    <div className="histogram-modal-overlay" onClick={onClose}>
      <div
        className="histogram-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="modal-title">
          Neuron Distribution
          {layerIndex !== undefined &&
            neuronIndex !== undefined &&
            ` - Layer ${layerIndex}, Neuron ${neuronIndex}`}
        </h2>
        <div ref={modalRef} className="histogram-container" />
      </div>
    </div>
  );
};

export default HistogramModal;
