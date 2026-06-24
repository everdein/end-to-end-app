package com.example.backend.repository;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
@Profile("json")
public class JsonFinancialsSnapshotStore implements FinancialsSnapshotStore {

  private final ObjectMapper objectMapper;
  private final Path dataPath;
  private final Path examplePath;

  public JsonFinancialsSnapshotStore(
      ObjectMapper objectMapper,
      @Value("${financials.data.path:data/financials.local.json}") Path dataPath,
      @Value("${financials.example-data.path:data/financials.example.json}") Path examplePath) {
    this.objectMapper = objectMapper;
    this.dataPath = dataPath;
    this.examplePath = examplePath;
  }

  @Override
  public FinancialsData load() {
    try {
      ensureDataFile();
      return objectMapper.readValue(dataPath.toFile(), FinancialsData.class);
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to load financial data from " + dataPath, exception);
    }
  }

  @Override
  public void save(FinancialsData data) {
    try {
      Path parent = dataPath.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      Path tempPath = dataPath.resolveSibling(dataPath.getFileName() + ".tmp");
      Path backupPath = dataPath.resolveSibling(dataPath.getFileName() + ".bak");
      objectMapper.writerWithDefaultPrettyPrinter().writeValue(tempPath.toFile(), data);

      if (Files.exists(dataPath)) {
        Files.copy(dataPath, backupPath, StandardCopyOption.REPLACE_EXISTING);
      }

      moveIntoPlace(tempPath);
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to save financial data to " + dataPath, exception);
    }
  }

  private void ensureDataFile() throws IOException {
    Path parent = dataPath.getParent();
    if (parent != null) {
      Files.createDirectories(parent);
    }

    if (Files.exists(dataPath)) {
      return;
    }

    if (Files.exists(examplePath)) {
      Files.copy(examplePath, dataPath);
      return;
    }

    save(FinancialsData.empty());
  }

  private void moveIntoPlace(Path tempPath) throws IOException {
    try {
      Files.move(
          tempPath, dataPath, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
    } catch (AtomicMoveNotSupportedException exception) {
      Files.move(tempPath, dataPath, StandardCopyOption.REPLACE_EXISTING);
    }
  }
}
