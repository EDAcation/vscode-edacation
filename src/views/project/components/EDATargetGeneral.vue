<script lang="ts">
/* global NodeJS, setTimeout, clearTimeout */
import type {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state.js';

let debounceTimer: NodeJS.Timeout | undefined = undefined;

type Errors = Record<'id' | 'name', string>;

const ErrorStyle = '--vscode-settings-textInputBorder: red; --vscode-focusBorder: red;';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        }
    },
    data() {
        return {
            state: globalState,
            projectState,

            errors: {} as Errors
        };
    },
    computed: {
        target(): ProjectTarget | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.projectState.project?.getTargets()[this.targetIndex];
        }
    },
    methods: {
        getErrorStyle(key: keyof Errors): string | undefined {
            const error = this.errors[key];
            return error ? ErrorStyle : undefined;
        },
        handleTextFieldChange(event: Event, key: 'id' | 'name') {
            if (!this.target || !event.target) {
                return;
            }
            const value = (event.target as HTMLInputElement).value;

            if (debounceTimer !== undefined) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                if (this.target) {
                    try {
                        if (key === 'id') {
                            this.target.id = value;
                        } else if (key === 'name') {
                            this.target.name = value;
                        }
                        delete this.errors[key];
                    } catch (error) {
                        this.errors[key] = (error as Error).message;
                    }
                }
                debounceTimer = undefined;
            }, 300);
        },
        handleIdChange(event: Event) {
            return this.handleTextFieldChange(event, 'id');
        },
        handleNameChange(event: Event) {
            return this.handleTextFieldChange(event, 'name');
        },
        handleTargetChange(event: Event, key: 'vendor' | 'family' | 'device' | 'package') {
            if (!this.target || !event.target) {
                return;
            }
            const value = (event.target as HTMLInputElement).value;

            if (key === 'vendor') {
                this.target.setVendor(value);
            } else if (key === 'family') {
                this.target.setFamily(value);
            } else if (key === 'device') {
                this.target.setDevice(value);
            } else if (key === 'package') {
                this.target.setPackage(value);
            }
        },
        handleVendorChange(event: Event) {
            return this.handleTargetChange(event, 'vendor');
        },
        handleFamilyChange(event: Event) {
            return this.handleTargetChange(event, 'family');
        },
        handleDeviceChange(event: Event) {
            return this.handleTargetChange(event, 'device');
        },
        handlePackageChange(event: Event) {
            return this.handleTargetChange(event, 'package');
        }
    }
});
</script>

<template>
    <template v-if="target">
        <div
            style="
                display: grid;
                grid-auto-flow: column;
                grid-template-rows: repeat(4, 1fr);
                grid-template-columns: repeat(2, minmax(320px, 1fr));
                column-gap: 1rem;
                margin-bottom: 1rem;
            "
        >
            <vscode-form-group variant="vertical">
                <vscode-label> ID </vscode-label>
                <vscode-textfield
                    placeholder="ID"
                    :value="target.id"
                    :style="getErrorStyle('id')"
                    @input="handleIdChange"
                />
            </vscode-form-group>

            <vscode-form-group variant="vertical">
                <vscode-label>Name</vscode-label>
                <vscode-textfield
                    placeholder="Name"
                    :value="target.name"
                    :style="getErrorStyle('name')"
                    @input="handleNameChange"
                />
            </vscode-form-group>

            <!-- TODO: Make this configurable again
            <vscode-textfield
                placeholder="Output directory"
                :value="target.directory || ''"
                @input="handleDirectoryChange"
                >Output directory</vscode-textfield
            > -->
            <div></div>

            <div></div>

            <vscode-form-group variant="vertical">
                <vscode-label>Vendor</vscode-label>
                <vscode-single-select :value="target.vendorId" @input="handleVendorChange">
                    <vscode-option
                        v-for="(vendor, vendorId) in target.availableVendors"
                        :key="vendorId"
                        :value="vendorId"
                    >
                        {{ vendor.name }}
                    </vscode-option>
                </vscode-single-select>
            </vscode-form-group>

            <vscode-form-group variant="vertical">
                <vscode-label>Family</vscode-label>
                <vscode-single-select :value="target.familyId" @input="handleFamilyChange">
                    <vscode-option
                        v-for="(family, familyId) in target.availableFamilies"
                        :key="familyId"
                        :value="familyId"
                    >
                        {{ family.name }}
                    </vscode-option>
                </vscode-single-select>
            </vscode-form-group>

            <vscode-form-group variant="vertical">
                <vscode-label>Device</vscode-label>
                <vscode-single-select :value="target.deviceId" @input="handleDeviceChange">
                    <vscode-option
                        v-for="(device, deviceId) in target.availableDevices"
                        :key="deviceId"
                        :value="deviceId"
                    >
                        {{ device.name }}
                    </vscode-option>
                </vscode-single-select>
            </vscode-form-group>

            <vscode-form-group variant="vertical">
                <vscode-label>Package</vscode-label>
                <vscode-single-select :value="target.packageId" @input="handlePackageChange">
                    <vscode-option
                        v-for="(packageName, packageId) in target.availablePackages"
                        :key="packageId"
                        :value="packageId"
                    >
                        {{ packageName }}
                    </vscode-option>
                </vscode-single-select>
            </vscode-form-group>
        </div>
    </template>
</template>

<style scoped></style>
