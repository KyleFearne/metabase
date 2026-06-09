(ns metabase.metabot.tools.charts-test
  "Tests that the chart tools emit a `generated_entity` card data part when the
   requesting surface declared the inline-viz capability, and a `navigate_to`
   otherwise."
  (:require
   [clojure.string :as str]
   [clojure.test :refer :all]
   [metabase.metabot.tools.charts :as charts]
   [metabase.metabot.tools.shared :as shared]))

;; create-chart only needs the query present in queries-state; the link builder
;; json-encodes it and `->legacy-mbql` passes a non-pMBQL value through unchanged,
;; so a stub query is enough to exercise the emission branch without a database.
(def ^:private stub-query
  {:database 1 :type "query" :query {:source-table 1}})

(defn- run-create-chart [capabilities]
  (let [memory (atom {:state   {:queries {"q-1" stub-query}}
                      :context {:capabilities capabilities}})]
    (binding [shared/*memory-atom* memory]
      (charts/create-chart-tool {:data_source  {:query_id "q-1"}
                                 :viz_settings {:chart_type "bar"}
                                 :title        "Orders by month"}))))

(deftest create-chart-inline-viz-test
  (testing "emits a single generated_entity card part when the surface can render inline"
    (let [parts  (:data-parts (run-create-chart #{"frontend:inline_viz_v1"}))
          entity (:data (first parts))]
      (is (= 1 (count parts)))
      (is (= "generated_entity" (:data-type (first parts))))
      (is (= "card" (:type entity)))
      (is (string? (:id entity)))
      (is (= "Orders by month" (:title entity)))
      (is (= "bar" (:display entity)))
      (testing "embeds the query so the FE can run it"
        (is (= "q-1" (get-in entity [:query :id])))
        (is (some? (get-in entity [:query :query]))))
      (is (not-any? #(= "navigate_to" (:data-type %)) parts))))

  (testing "emits a single navigate_to data part when the surface cannot render inline"
    (let [parts (:data-parts (run-create-chart #{}))]
      (is (= 1 (count parts)))
      (is (= "navigate_to" (:data-type (first parts))))
      (is (str/starts-with? (:data (first parts)) "/question#"))
      (is (not-any? #(= "generated_entity" (:data-type %)) parts)))))
