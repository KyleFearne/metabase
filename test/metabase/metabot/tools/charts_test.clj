(ns metabase.metabot.tools.charts-test
  "Tests that the chart tools always emit a `generated_entity` card data part. The
   inline-vs-navigate decision now lives on the frontend, so the backend no longer
   branches on a capability."
  (:require
   [clojure.test :refer :all]
   [metabase.metabot.tools.charts :as charts]
   [metabase.metabot.tools.shared :as shared]))

;; create-chart only needs the query present in queries-state; the link builder
;; json-encodes it and `->legacy-mbql` passes a non-pMBQL value through unchanged,
;; so a stub query is enough to exercise the emission branch without a database.
(def ^:private stub-query
  {:database 1 :type "query" :query {:source-table 1}})

(defn- run-create-chart []
  (let [memory (atom {:state {:queries {"q-1" stub-query}}})]
    (binding [shared/*memory-atom* memory]
      (charts/create-chart-tool {:data_source  {:query_id "q-1"}
                                 :viz_settings {:chart_type "bar"}
                                 :title        "Orders by month"}))))

(deftest create-chart-generated-entity-test
  (testing "emits a single generated_entity card part"
    (let [parts  (:data-parts (run-create-chart))
          entity (:data (first parts))]
      (is (= 1 (count parts)))
      (is (= "generated_entity" (:data-type (first parts))))
      (is (= "card" (:type entity)))
      (is (string? (:id entity)))
      (is (= "Orders by month" (:title entity)))
      (is (= "bar" (:display entity)))
      (testing "embeds the query so the FE can run it"
        (is (= "q-1" (get-in entity [:query :id])))
        (is (some? (get-in entity [:query :query])))))))
