<script lang="ts">
import {VENDORS} from 'edacation';
import type {Device, Family, Vendor, VendorId, TargetConfiguration, YosysConfiguration, NextpnrConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        }
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.state.project!.configuration.targets[this.targetIndex];
        },
        yosys(): YosysConfiguration | undefined {
            if (!this.target) {
                return this.state.project!.configuration.defaults?.yosys;
            }
            return this.target.yosys;
        },
        nextpnr(): NextpnrConfiguration | undefined {
            if (!this.target) {
                return this.state.project!.configuration.defaults?.nextpnr;
            }
            return this.target.nextpnr;
        },
        vendors() {
            return VENDORS;
        },
        vendor(): Vendor | undefined {
            if (!this.target) {
                return undefined;
            }
            return VENDORS[this.target.vendor as VendorId];
        },
        families(): Record<string, Family> {
            if (!this.vendor) {
                return {};
            }
            return this.vendor.families;
        },
        family(): Family | undefined {
            if (!this.target || !this.vendor) {
                return undefined;
            }
            return this.vendor.families[this.target.family];
        },
        devices(): Record<string, Device> {
            if (!this.family) {
                return {};
            }
            return this.family.devices;
        },
        device(): Device | undefined {
            if (!this.target || !this.family) {
                return undefined;
            }
            return this.family.devices[this.target.device];
        },
        packages(): Record<string, string> {
            const target = this.target;
            if (!target || !this.device) {
                return {};
            }

            return this.device.packages.reduce((prev, packageId) => {
                const vendorPackages: Record<string, string> = VENDORS[target.vendor as VendorId].packages;
                prev[packageId] = vendorPackages[packageId] ?? packageId;
                return prev;
            }, {} as Record<string, string>);
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        handleTextFieldChange(event: Event, key: 'id' | 'name' | 'directory') {
            if (!this.target || !event.target) {
                return;
            }

            this.target[key] = (event.target as HTMLInputElement).value;
        },
        handleIdChange(event: Event) {
            return this.handleTextFieldChange(event, 'id');
        },
        handleNameChange(event: Event) {
            return this.handleTextFieldChange(event, 'name');
        },
        handleDirectoryChange(event: Event) {
            return this.handleTextFieldChange(event, 'directory');
        },
        handleTargetChange(event: Event, key: 'vendor' | 'family' | 'device' | 'package') {
            if (!this.target || !event.target) {
                return;
            }

            this.target[key] = (event.target as HTMLInputElement).value;

            if (!this.vendors[this.target.vendor as VendorId]) {
                this.target.vendor = Object.keys(this.vendors)[0];
            }
            if (!this.families[this.target.family]) {
                this.target.family = Object.keys(this.families)[0];
            }
            if (!this.devices[this.target.device]) {
                this.target.device = Object.keys(this.devices)[0];
            }
            if (!this.packages[this.target.package]) {
                this.target.package = Object.keys(this.packages)[0];
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
        <div style="display: grid; grid-auto-flow: column; grid-template-rows: repeat(4, 1fr); grid-template-columns: repeat(2, minmax(320px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <vscode-text-field placeholder="ID" :value="target.id" @input="handleIdChange">ID</vscode-text-field>

            <vscode-text-field placeholder="Name" :value="target.name" @input="handleNameChange">Name</vscode-text-field>

            <vscode-text-field placeholder="Output directory" :value="target.directory || ''" @input="handleDirectoryChange">Output directory</vscode-text-field>

            <div></div>

            <div>
                <label style="display: block; margin-bottom: 2px;">Vendor</label>
                <vscode-dropdown :value="target.vendor" @input="handleVendorChange" style="display: block; min-width: 20rem;">
                    <vscode-option v-for="(vendor, vendorId) in vendors" :key="vendorId" :value="vendorId">{{ vendor.name }}</vscode-option>
                </vscode-dropdown>
            </div>
            <div>
                <label style="display: block; margin-bottom: 2px;">Family</label>
                <vscode-dropdown :value="target.family" @input="handleFamilyChange" style="display: block; min-width: 20rem;">
                    <vscode-option v-for="(family, familyId) in families" :key="familyId" :value="familyId">{{ family.name }}</vscode-option>
                </vscode-dropdown>
            </div>
            <div>
                <label style="display: block; margin-bottom: 2px;">Device</label>
                <vscode-dropdown :value="target.device" @input="handleDeviceChange" style="display: block; min-width: 20rem;">
                    <vscode-option v-for="(device, deviceId) in devices" :key="deviceId" :value="deviceId">{{ device.name }}</vscode-option>
                </vscode-dropdown>
            </div>
            <div>
                <label style="display: block; margin-bottom: 2px;">Package</label>
                <vscode-dropdown :value="target.package" @input="handlePackageChange" style="display: block; min-width: 20rem;">
                    <vscode-option v-for="(packageName, packageId) in packages" :key="packageId" :value="packageId">{{ packageName }}</vscode-option>
                </vscode-dropdown>
            </div>
        </div>
    </template>
</template>

<style scoped>

</style>
