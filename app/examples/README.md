# Example data

These files contain synthetic recordings for developing and demonstrating data
import and visualization. They are not experimental results.

The three CSV files cover the same 29-minute interval with different sampling
rates:

- `downsampling-demo.csv` records reactor temperature and pressure every minute.
- `mfc-log.csv` records two gas-flow setpoints and measurements every 30 seconds.
- `ftir-gas-analysis.csv` records derived gas concentrations every two minutes.

Each JSON file is a sidecar for the CSV with the same name. It describes the
time axis and maps every recorded column to a synthetic device and channel.
