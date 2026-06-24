package com.example.backend.repository;

public interface FinancialsSnapshotStore {

  FinancialsData load();

  void save(FinancialsData data);
}
